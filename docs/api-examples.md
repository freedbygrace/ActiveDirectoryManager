# API Examples

This document provides examples of using the Active Directory Management API, including the new password reset and account management endpoints.

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Password Management](#password-management)
- [Account Status Management](#account-status-management)
- [Group Management](#group-management)
- [Bulk Operations](#bulk-operations)
- [Error Handling](#error-handling)

## Authentication

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "System Administrator",
    "role": "admin"
  }
}
```

### Using the Token

For all subsequent requests, include the token in the Authorization header:

```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## User Management

### Get All Users

```bash
curl -X GET http://localhost:5000/api/connections/1/ad-users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get User by ObjectGUID

```bash
curl -X GET http://localhost:5000/api/connections/1/ad-users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Create User

```bash
curl -X POST http://localhost:5000/api/connections/1/ad-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "sAMAccountName": "jdoe",
    "givenName": "John",
    "sn": "Doe",
    "displayName": "John Doe",
    "mail": "jdoe@example.com",
    "userPrincipalName": "jdoe@example.com",
    "parentOU": "OU=Users,DC=example,DC=com",
    "password": "SecurePassword123!",
    "enabled": true
  }'
```

### Update User

```bash
curl -X PATCH http://localhost:5000/api/connections/1/ad-users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "displayName": "John A. Doe",
    "mail": "john.doe@example.com",
    "telephoneNumber": "+1 (555) 123-4567"
  }'
```

### Delete User

```bash
curl -X DELETE http://localhost:5000/api/connections/1/ad-users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Password Management

### Reset User Password

```bash
curl -X POST http://localhost:5000/api/connections/1/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userObjectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "newPassword": "NewSecurePassword456!",
    "skipValidation": false,
    "requirePasswordChangeAtNextLogon": true
  }'
```

Response:

```json
{
  "success": true,
  "message": "Password reset successful for user with GUID a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Reset Password with Skip Validation

For scenarios where you need to bypass password policy validation:

```bash
curl -X POST http://localhost:5000/api/connections/1/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userObjectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "newPassword": "TempPass123",
    "skipValidation": true,
    "requirePasswordChangeAtNextLogon": true
  }'
```

### Reset Password Without Requiring Change at Next Logon

```bash
curl -X POST http://localhost:5000/api/connections/1/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userObjectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "newPassword": "NewSecurePassword456!",
    "requirePasswordChangeAtNextLogon": false
  }'
```

## Account Status Management

### Enable User Account

```bash
curl -X POST http://localhost:5000/api/connections/1/enable-user-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userObjectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "enabled": true
  }'
```

Response:

```json
{
  "success": true,
  "message": "User account enabled successfully for user with GUID a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Disable User Account

```bash
curl -X POST http://localhost:5000/api/connections/1/enable-user-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userObjectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "enabled": false
  }'
```

Response:

```json
{
  "success": true,
  "message": "User account disabled successfully for user with GUID a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Bulk Enable User Accounts

```bash
curl -X POST http://localhost:5000/api/connections/1/bulk-enable-user-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userDNs": [
      "CN=John Doe,OU=Users,DC=example,DC=com",
      "CN=Jane Smith,OU=Users,DC=example,DC=com",
      "CN=Bob Johnson,OU=Users,DC=example,DC=com"
    ],
    "enabled": true
  }'
```

Response:

```json
{
  "success": [
    "CN=John Doe,OU=Users,DC=example,DC=com",
    "CN=Jane Smith,OU=Users,DC=example,DC=com",
    "CN=Bob Johnson,OU=Users,DC=example,DC=com"
  ],
  "failed": []
}
```

### Bulk Disable User Accounts

```bash
curl -X POST http://localhost:5000/api/connections/1/bulk-enable-user-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userDNs": [
      "CN=John Doe,OU=Users,DC=example,DC=com",
      "CN=Jane Smith,OU=Users,DC=example,DC=com",
      "CN=Bob Johnson,OU=Users,DC=example,DC=com"
    ],
    "enabled": false
  }'
```

## Group Management

### Add User to Group

```bash
curl -X POST http://localhost:5000/api/connections/1/add-to-group \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "objectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "groupObjectGUID": "g1h2i3j4-k5l6-7890-mnop-qr1234567890",
    "objectType": "user"
  }'
```

### Remove User from Group

```bash
curl -X POST http://localhost:5000/api/connections/1/remove-from-group \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "objectGUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "groupObjectGUID": "g1h2i3j4-k5l6-7890-mnop-qr1234567890",
    "objectType": "user"
  }'
```

## Error Handling

### Invalid Request

```json
{
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["userObjectGUID"],
      "message": "User ObjectGUID is required"
    }
  ]
}
```

### User Not Found

```json
{
  "message": "User not found"
}
```

### Permission Denied

```json
{
  "message": "You do not have permission to perform this action"
}
```

### LDAP Operation Failed

```json
{
  "message": "Failed to reset password",
  "error": "LDAP operation failed: Constraint violation"
}
```
