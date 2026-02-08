from rest_framework import generics, response
from django.contrib.auth.models import User
from .serializers import UserSerializer
from rest_framework.permissions import AllowAny




class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    
    def currentUser(request):
        user = request.user
        return  response({
            'id': user.id,
            'username' : user.username,
        })
        
        

