# DocsDrafter

A React Native app built with Expo, TypeScript, and Supabase for document management.

## Features

- 🔐 **Authentication** - User registration and login with Supabase
- 🧭 **Navigation** - File-based routing with Expo Router
- 🎨 **Styling** - Tailwind CSS with NativeWind
- 📱 **Cross-platform** - iOS, Android, and Web support
- 🔒 **Secure Storage** - Expo SecureStore for sensitive data
- 📄 **PDF Support** - React Native PDF viewer
- 📋 **Forms** - React Hook Form for form management

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Backend**: Supabase
- **Navigation**: Expo Router
- **Styling**: NativeWind (Tailwind CSS)
- **Forms**: React Hook Form
- **Storage**: Expo SecureStore
- **PDF**: React Native PDF

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home page
│   ├── auth.tsx           # Authentication page
│   └── profile.tsx        # Profile page
├── components/            # Reusable components
│   └── LoadingSpinner.tsx
├── hooks/                 # Custom React hooks
│   └── useAuth.ts
├── lib/                   # Utilities and configurations
│   └── supabase.ts        # Supabase client
├── screens/               # Screen components (if needed)
├── assets/                # Images and static files
├── .env                   # Environment variables
├── global.css             # Global styles
├── tailwind.config.js     # Tailwind configuration
└── metro.config.js        # Metro bundler configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update the `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Run the App

```bash
# Start the development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Authentication Flow

1. **Sign Up**: Users can create new accounts with email/password
2. **Sign In**: Existing users can log in
3. **Protected Routes**: Authenticated users can access profile and other protected screens
4. **Secure Storage**: Session tokens are stored securely using Expo SecureStore

## Styling with NativeWind

This project uses NativeWind for styling, which brings Tailwind CSS to React Native:

```tsx
// Example usage
<View className="flex-1 justify-center items-center bg-white">
  <Text className="text-2xl font-bold text-gray-800">Hello World</Text>
  <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg mt-4">
    <Text className="text-white font-semibold">Button</Text>
  </TouchableOpacity>
</View>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.