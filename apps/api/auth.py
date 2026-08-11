import os
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel, field_validator

import database

# ── Config ────────────────────────────────────────────────────────────────────

SECRET_KEY    = os.getenv("JWT_SECRET", "algomentor-dev-secret-change-in-prod-32chars!")
ALGORITHM     = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES  = 15
REFRESH_TOKEN_EXPIRE_DAYS    = 7
REFRESH_COOKIE_NAME          = "algomentor_refresh"
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://algomentor-app.vercel.app")

bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["auth"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3–30 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, _ and -")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _hash_token(token: str) -> str:
    """SHA-256 hash a token before storing in DB."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "access", "jti": str(uuid.uuid4())},
        SECRET_KEY, algorithm=ALGORITHM,
    )


def create_refresh_token(user_id: str) -> tuple[str, str]:
    """Returns (raw_token, expires_at_iso). Store hash in DB, send raw to client."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    raw = jwt.encode(
        {"sub": user_id, "exp": expire, "type": "refresh", "jti": str(uuid.uuid4())},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    return raw, expire.strftime("%Y-%m-%d %H:%M:%S")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,       # set True in production (HTTPS)
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth/refresh",
    )


def _clear_refresh_cookie(response: Response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/auth/refresh")


# ── Auth dependency ───────────────────────────────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = database.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        return database.get_user_by_id(payload["sub"])
    except HTTPException:
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, response: Response):
    if database.get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    pw_hash = hash_password(req.password)
    try:
        user = database.create_user(req.email, req.username, pw_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Username already taken")

    access_token = create_access_token(user["id"])
    raw_refresh, expires_at = create_refresh_token(user["id"])
    database.create_session(user["id"], _hash_token(raw_refresh), expires_at)
    _set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        user=UserOut(id=user["id"], email=user["email"], username=user["username"]),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, response: Response):
    user = database.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    database.update_last_active(user["id"])
    access_token = create_access_token(user["id"])
    raw_refresh, expires_at = create_refresh_token(user["id"])
    database.create_session(user["id"], _hash_token(raw_refresh), expires_at)
    _set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        user=UserOut(id=user["id"], email=user["email"], username=user["username"],
                     avatar_url=user.get("avatar_url")),
    )


@router.post("/refresh")
def refresh_token(request: Request, response: Response):
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(raw)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    session = database.get_session_by_token(_hash_token(raw))
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or revoked")

    user = database.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: revoke old, issue new
    database.revoke_session(session["id"])
    new_access = create_access_token(user["id"])
    new_raw_refresh, expires_at = create_refresh_token(user["id"])
    database.create_session(user["id"], _hash_token(new_raw_refresh), expires_at)
    _set_refresh_cookie(response, new_raw_refresh)

    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
def logout(request: Request, response: Response,
           current_user: dict = Depends(get_current_user)):
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw:
        session = database.get_session_by_token(_hash_token(raw))
        if session:
            database.revoke_session(session["id"])
    _clear_refresh_cookie(response)
    return {"status": "logged out"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    database.update_last_active(current_user["id"])
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        avatar_url=current_user.get("avatar_url"),
    )


# ── Password reset ────────────────────────────────────────────────────────────

RESET_TOKEN_EXPIRE_MINUTES = 60


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


def _send_reset_email(to_email: str, reset_url: str) -> None:
    """Send password reset email via Resend. Logs URL if no API key configured."""
    if not RESEND_API_KEY:
        print(f"[email] No RESEND_API_KEY set. Reset URL: {reset_url}")
        return
    try:
        import httpx
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": "AlgoMentor <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "Reset your AlgoMentor password",
                "html": f"""
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                  <h2 style="color:#6366f1">Reset your password</h2>
                  <p>Click the button below to set a new password. This link expires in 1 hour.</p>
                  <a href="{reset_url}"
                     style="display:inline-block;background:#6366f1;color:#fff;
                            padding:12px 24px;border-radius:8px;text-decoration:none;
                            font-weight:600;margin:16px 0">
                    Reset Password
                  </a>
                  <p style="color:#888;font-size:13px">
                    If you didn't request this, you can safely ignore this email.
                  </p>
                </div>
                """,
            },
            timeout=10,
        )
        if resp.status_code >= 400:
            print(f"[email] Resend error {resp.status_code}: {resp.text}")
        else:
            print(f"[email] Sent reset email to {to_email}")
    except Exception as e:
        print(f"[email] Failed to send reset email: {e}")


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    user = database.get_user_by_email(req.email)
    generic = {"message": "If that email is registered, a reset link has been sent."}
    if not user:
        return generic

    raw_token = str(uuid.uuid4()) + str(uuid.uuid4())
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    database.create_reset_token(user["id"], token_hash, expire.strftime("%Y-%m-%d %H:%M:%S"))

    reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
    _send_reset_email(user["email"], reset_url)
    return generic


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    token_hash = hashlib.sha256(req.token.encode()).hexdigest()
    record = database.get_reset_token(token_hash)
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Check expiry
    expires_at = datetime.fromisoformat(record["expires_at"]).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        database.mark_reset_token_used(record["id"])
        raise HTTPException(status_code=400, detail="Reset token has expired")

    new_hash = hash_password(req.new_password)
    database.update_user_password(record["user_id"], new_hash)
    database.mark_reset_token_used(record["id"])
    # Revoke all sessions so existing logins are invalidated
    database.revoke_all_user_sessions(record["user_id"])
    return {"message": "Password updated successfully. Please sign in."}
