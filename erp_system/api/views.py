from rest_framework import generics, response, views, permissions
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from rest_framework.permissions import AllowAny

User = get_user_model()
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class CurrentUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return response.Response(
            {
                "id": user.id,
                "username": user.username,
                "is_superuser": user.is_superuser,
                "role": getattr(user, "role", None),
            }
        )