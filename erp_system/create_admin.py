import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Mapped exactly to your CustomUser roles in accounts/models.py
test_accounts = [
    {
        "username": "admin",
        "password": "admin01",
        "role": "ADMIN",
        "is_superuser": True,
        "is_staff": True
    },
    {
        "username": "Manager1",
        "password": "mmestryman01",
        "role": "MANAGER",
        "is_superuser": False,
        "is_staff": True
    },
    {
        "username": "Manager2",
        "password": "mmestryman02",
        "role": "MANAGER",
        "is_superuser": False,
        "is_staff": True
    },
    {
        "username": "Stock-Manager",
        "password": "mmestrysm01",
        "role": "STOCK_MANAGER",
        "is_superuser": False,
        "is_staff": True
    }
]

print("Starting custom user provisioning...")

for account in test_accounts:
    if not User.objects.filter(username=account["username"]).exists():
        print(f"Provisioning account: {account['username']} with role: {account['role']}")
        
        # Pop the password and role to handle them cleanly
        password = account.pop("password")
        role_value = account.pop("role")
        
        # Create user instance
        user = User.objects.create(**account)
        user.set_password(password)
        
        # Inject the custom role field
        user.role = role_value
        user.save()
        print(f" Successfully created {user.username}!")
    else:
        # If the account exists, make sure the role and passwords are up to date
        user = User.objects.get(username=account["username"])
        user.role = account["role"]
        user.is_superuser = account["is_superuser"]
        user.is_staff = account["is_staff"]
        user.set_password(account["password"])
        user.save()
        print(f"Account {user.username} already exists. Updated password and role successfully.")

print("All user profiles successfully configured!")
