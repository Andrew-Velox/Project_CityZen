from django.http import HttpResponse
from django.shortcuts import render
from django.contrib.auth import get_user_model
from .serializers import UserSerializer,RegistrationSerializer,UserUpdateSerializer,PasswordChangeSerializer,ProfileDeleteSerializer
from rest_framework import viewsets,mixins
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode,urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.shortcuts import redirect
from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import os
from drf_spectacular.utils import extend_schema,OpenApiExample
from drf_spectacular.types import OpenApiTypes
from django.utils import timezone
from rest_framework.decorators import action

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser] 


class RegistrationViewSet(mixins.CreateModelMixin,viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny] 

    @extend_schema(
        summary="Register a new user",
        description="""
        Register a new user account with email verification.
        
        **Process:**
        1. User submits registration data
        2. Account is created with `is_active=False`
        3. Verification email is sent to the provided email address
        4. User must click the activation link to activate their account
        
        **Required Fields:**
        - username: Unique username (3-150 characters)
        - first_name: User's first name
        - last_name: User's last name
        - email: Valid email address (must be unique)
        - password: Strong password (min 8 characters)
        - confirm_password: Must match password
        
        **Response:**
        - Success: Message to check email for confirmation
        - Error: Validation errors with field-specific messages
        
        **Examples:**
        
        ```json
        {
            "username": "johndoe",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123"
        }
        ```
        
        **Common Errors:**
        - Email already exists
        - Passwords don't match
        - Invalid email format
        - Username already taken
        """,
        request=RegistrationSerializer,
        responses={
            201: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
        }
    )


    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            confirm_link = f"https://my-django-template.onrender.com/user/account/active/{uid}/{token}"

            email_subject = "Confirm Your Email"
            email_body = render_to_string('confirm_account_email.html',{'confirm_link':confirm_link})

            email = EmailMultiAlternatives(email_subject,"",from_email=settings.EMAIL_HOST_USER,to=[user.email])
            email.attach_alternative(email_body,"text/html")
            try:
                email.send()
                print(f"Email sent successfully to {user.email}")
                return Response({"message": "Check Your Mail for Confirmation"}, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"Email Error: {str(e)}")
                return Response({"message": "User created but email failed to send", "error": str(e)}, status=status.HTTP_201_CREATED)
        
        # Log validation errors for debugging
        print(f"Registration validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

def activate(request,uid64,token):
    try:
        uid = urlsafe_base64_decode(uid64).decode()
        user = User._default_manager.get(pk=uid)
    except(User.DoesNotExist):
        user=None
    
    if user is not None and default_token_generator.check_token(user,token):
        user.is_active=True
        user.save()

        return HttpResponse("Account activated successfully! You can now log in.")
    else:
        return HttpResponse("Activation link is invalid or expired.")
    #     return redirect("http://127.0.0.1:8000/login")
    # return redirect("http://127.0.0.1:8000/register")

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [AllowAny] 
    
    def get_queryset(self):
        # Return only the logged-in user's profile
        return User.objects.filter(id=self.request.user.id)

    def perform_update(self, serializer):
        # Optional: ensure users can only update themselves
        serializer.save(id=self.request.user.id)



class UserUpdateViewSet(viewsets.ModelViewSet):
    
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [AllowAny] 
    parser_classes = [MultiPartParser, FormParser, JSONParser]


    @extend_schema(
        summary="Update user profile",
        description="""
        Update user profile information including profile image.
        
        **Features:**
        - Update first name, last name, email, and profile image
        - Automatically deletes old profile image when uploading new one
        - Supports partial updates (PATCH) or full updates (PUT)
        
        **Important:**
        - Use `multipart/form-data` content type for image uploads
        - Image field accepts JPG, PNG, GIF, WebP formats
        - Maximum file size: 5MB (configurable)
        
        **Examples:**
        
        To update only the profile image:
        ```
        PATCH /user/profile/update/14/
        Content-Type: multipart/form-data
        
        image: [file]
        ```
        
        To update all fields:
        ```
        PATCH /user/profile/update/14/
        Content-Type: multipart/form-data
        
        first_name: John
        last_name: Doe
        email: john@example.com
        image: [file]
        ```
        """,
        request=UserUpdateSerializer,
        responses={
            200: UserUpdateSerializer,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Update with image',
                description='Update user profile with new image',
                value={
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'email': 'john@example.com',
                    'image': 'profile.jpg'
                }
            ),
        ]
    )
    
    def partial_update(self, request, *args, **kwargs):

        

        instance = self.get_object()
        old_image = instance.image  
        
        # Validate first
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        
        serializer.save()
        
        # Delete old image AFTER saving new one
        if 'image' in request.data and old_image:
            if os.path.isfile(old_image.path):
                try:
                    os.remove(old_image.path)
                except:
                    pass  
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class PasswordChangeViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = PasswordChangeSerializer
    permission_classes = [AllowAny] 


    @extend_schema(
        summary="Change user password",
        description="""
        Change the password for a user account.
        
        **Process:**
        1. User provides new password and confirmation
        2. Password is updated if both match
        
        **Required Fields:**
        - new_password: The new password to set
        - confirm_password: Must match new_password
        
        **Response:**
        - Success: Message indicating password change
        - Error: Validation errors with field-specific messages
        
        **Examples:**
        
        ```json
        {
            "new_password": "NewSecurePass123",
            "confirm_password": "NewSecurePass123"
        }
        ```
        
        **Common Errors:**
        - Passwords don't match
        """,
        request=PasswordChangeSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        }
    )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.get_object()
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        # Sending Mail Notification

        email_subject = "Password Changed Mail"
        email_body = render_to_string('pass_change_email.html',{'time': timezone.now(),'user_name':user.username,'support_email':settings.EMAIL_HOST_USER})

        email = EmailMultiAlternatives(email_subject,"",from_email=settings.EMAIL_HOST_USER,to=[user.email])
        email.attach_alternative(email_body,"text/html")
        try:
            email.send()
            print(f"Email sent successfully to {user.email}")  # Check console
            # return Response({"message": "Check Your Mail for Confirmation"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Email Error: {str(e)}")  # Check console
            # return Response({"message": "User created but email failed to send", "error": str(e)}, status=status.HTTP_201_CREATED)
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)
    

class ProfileDeleteViewSet(viewsets.GenericViewSet):
    serializer_class = ProfileDeleteSerializer
    permission_classes = [IsAuthenticated] 


    @extend_schema(
        summary="Delete user profile",
        description=
        """
        Delete user account after password verification.
        
        **Process:**
        1. User submits their current password
        2. Password is verified
        3. If correct, user account is permanently deleted
        4. All associated data (profile image, etc.) is removed
        
        **Required Fields:**
        - password: User's current password for verification
        
        **Request Body (JSON):**
        ```json
        {
            "password": "current_password"
        }
        ```
        
        **Response:**
        - 204 No Content: Account deleted successfully
        - 400 Bad Request: Incorrect password or validation error
        - 401 Unauthorized: Not authenticated
        
        **Note:**
        - This action is irreversible
        - User must be logged in (provide valid access token)
        - Profile image will be automatically deleted
        """,
        responses={
            200: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        }
    )

    @action(detail=False, methods=['delete'])
    def delete_account(self,request):
        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        user = request.user

        if user.image:
            if os.path.isfile(user.image.path):
                try:
                    os.remove(user.image.path)
                except:
                    pass

        user.delete()

        return Response({"detail": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

