from ninja.security import HttpBearer
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            access = AccessToken(token)
            user = User.objects.get(id=access["user_id"])
            request.user = user
            return user
        except Exception:
            return None
