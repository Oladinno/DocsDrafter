# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-16

### Added
- **Complete Authentication System with Supabase Auth**
  - User registration with email verification
  - Secure login/logout functionality
  - Password reset flow with email confirmation
  - Session persistence using expo-secure-store
  - Role-based access control (admin, editor, viewer)
  - Profile management with automatic creation

- **Authentication Screens**
  - Login screen with form validation and error handling
  - Register screen with strong password requirements
  - Forgot password screen with email reset flow
  - Unauthorized access screen for permission denied scenarios

- **Route Protection System**
  - ProtectedRoute component for securing authenticated routes
  - Role-based route protection
  - Automatic redirects for unauthorized access
  - Higher-order component wrapper for screen protection

- **Enhanced Dashboard**
  - Role-based document management
  - Document CRUD operations with permissions
  - Search and filter functionality
  - User profile display with role information
  - Secure logout with session cleanup

- **Database Schema Enhancements**
  - User profiles table with role assignments
  - Documents table with user ownership
  - Role-based permissions system
  - Comprehensive TypeScript type definitions

- **Authentication Hooks**
  - Enhanced useAuth hook with role management
  - Session state management
  - Profile loading and refresh capabilities
  - Helper hooks: useUser, useProfile, useRole, useRequireAuth, useRequireRole

### Enhanced
- **Supabase Integration**
  - Extended auth helper functions
  - Document management functions
  - Role checking and permission validation
  - Profile management operations

- **Application Structure**
  - AuthProvider context for global state management
  - Updated app layout with proper routing
  - Beautiful landing page for new users
  - Improved navigation flow

### Security
- Secure session storage using expo-secure-store
- Role-based access control enforcement
- Protected routes with automatic authentication checks
- Secure password requirements and validation
- Complete session cleanup on logout

## [1.0.0] - 2024-01-15 - Initial Release

### Added
- **Project Setup**
  - Expo React Native TypeScript boilerplate
  - Supabase integration for backend services
  - Expo Router for navigation
  - NativeWind for styling (Tailwind CSS)

- **Authentication Foundation**
  - Basic Supabase auth configuration
  - User authentication hooks
  - Session management setup

- **Project Structure**
  - Organized folder structure
  - Core screens and components
  - Custom hooks for reusable logic
  - Reusable UI components

- **Development Environment**
  - Environment variables configuration
  - TypeScript configuration
  - ESLint and development tools
  - Metro bundler configuration

- **Documentation**
  - README with setup instructions
  - Project structure documentation
  - Development guidelines

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created comprehensive Supabase database schema with SQL migration file
  - Added `users` table extending Supabase auth.users with profile data
  - Added `templates` table for document templates with JSON schema definitions
  - Added `documents` table for user-generated documents with file storage references
  - Implemented Row Level Security (RLS) policies for data isolation
  - Added automatic user profile creation trigger
  - Included sample document templates (Business Letter, Invoice, Meeting Minutes)
- Created detailed Supabase setup guide with multiple implementation methods
  - Dashboard-based setup instructions for beginners
  - CLI-based setup for development workflows
  - Direct SQL execution methods
  - Comprehensive troubleshooting and testing guidance
- Fully functional dashboard screen for logged-in users with document management
- Document list display with template name, file type, and creation date
- View, Download, and Delete actions for each document
- Floating action button for creating new documents (navigates to template selection)
- Real-time document fetching from Supabase with proper error handling
- Search functionality to filter documents by template name

### Changed

### Deprecated

### Removed

### Fixed
- Fixed Android bundling error caused by JSX syntax in TypeScript file
  - Renamed `hooks/useAuth.ts` to `hooks/useAuth.tsx` to support JSX compilation
  - Updated all import statements across the application to reference correct file paths
- Fixed React component import/export errors
  - Corrected LoadingSpinner component imports from named to default import syntax
  - Fixed "Element type is invalid" error in HomePage and other components
  - Updated import statements in all authentication screens and components
- Database schema mismatch by updating migration to create `profiles` table instead of `users` table to match application code expectations
- User profile loading error (PGRST205) by correcting table references in migration file and setup guide
- Fixed migration script to handle re-running by adding DROP IF EXISTS statements for policies, functions, and triggers

### Security

## [1.0.0] - 2024-01-15

### Added
- Initial project setup with Expo React Native TypeScript boilerplate
- Supabase integration for authentication and database
- Expo Router navigation system with file-based routing
- NativeWind (Tailwind CSS) styling configuration
- Authentication system with sign-in/sign-up functionality
- Project structure with organized folders (screens, components, lib, hooks)
- Core screens: Home (index), Authentication, and Profile
- Custom hooks for authentication state management (useAuth)
- Reusable components (LoadingSpinner)
- Supabase client configuration with Expo SecureStore integration
- Environment variables setup for secure API key management
- Metro bundler configuration for NativeWind
- Tailwind CSS configuration with custom theme
- Global CSS styles with utility classes and component styles
- App configuration updates for expo-router scheme
- Comprehensive README.md with setup instructions
- TypeScript configuration for type safety
- Package.json with all required dependencies and scripts

---

## How to Use This Changelog

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

When making changes, add them under the "Unreleased" section and move them to a versioned section when releasing.