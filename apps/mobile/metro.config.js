const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace root so Metro can see packages/*
config.watchFolders = [workspaceRoot];

// Tell Metro to follow symlinks (pnpm hoists via symlinks into .pnpm store)
config.resolver.unstable_enableSymlinks = true;

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure Metro can resolve .cjs / .mjs files shipped by @supabase/supabase-js v2+
config.resolver.sourceExts = [
  ...(config.resolver.sourceExts || []),
  'cjs',
  'mjs',
];

config.resolver.extraNodeModules = {
  '@nakshra/shared-types': path.resolve(workspaceRoot, 'packages/shared-types/src'),
  '@nakshra/shared-config': path.resolve(workspaceRoot, 'packages/shared-config/src'),
  '@nakshra/shared-utils': path.resolve(workspaceRoot, 'packages/shared-utils/src'),
  '@nakshra/shared-services': path.resolve(workspaceRoot, 'packages/shared-services/src'),
  '@nakshra/shared-api': path.resolve(workspaceRoot, 'packages/shared-api/src'),
  '@nakshra/shared-auth': path.resolve(workspaceRoot, 'packages/shared-auth/src'),
  '@nakshra/shared-state': path.resolve(workspaceRoot, 'packages/shared-state/src'),
  '@nakshra/shared-hooks': path.resolve(workspaceRoot, 'packages/shared-hooks/src'),
  '@nakshra/shared-validation': path.resolve(workspaceRoot, 'packages/shared-validation/src'),
  '@': path.resolve(projectRoot, 'src'),
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
};

// Intercept resolution for react and react-native modules to enforce single instance from mobile-app/node_modules
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react' ||
    moduleName.startsWith('react/') ||
    moduleName === 'react-native' ||
    moduleName.startsWith('react-native/') ||
    moduleName === 'react-dom' ||
    moduleName === 'scheduler'
  ) {
    return context.resolveRequest(
      {
        ...context,
        originModulePath: path.resolve(projectRoot, 'App.tsx'),
      },
      moduleName,
      platform
    );
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
