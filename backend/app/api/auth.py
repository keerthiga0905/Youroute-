from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.database.models import User
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, UserUpdatePriority, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            email = payload["sub"]
            user = db.query(User).filter(User.email == email).first()
            if user:
                return user

    # Fallback default user for seamless testing/demo mode
    demo_email = "keerthigamurali3116@gmail.com"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            full_name="Keerthiga M",
            phone="+91 98765 43210",
            hashed_password=get_password_hash("DemoPass123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.post("/demo-session", response_model=Token)
def create_demo_session(db: Session = Depends(get_db)):
    demo_email = "keerthigamurali3116@gmail.com"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            full_name="Keerthiga M",
            phone="+91 98765 43210",
            hashed_password=get_password_hash("DemoPass123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@router.post("/login", response_model=Token)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/priority", response_model=UserResponse)
def update_priority(payload: UserUpdatePriority, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.preferred_priority = payload.preferred_priority
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/account")
def delete_user_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account and associated data deleted successfully"}
