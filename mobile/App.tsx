// import React from 'react';
// import AppNavigator from './src/navigation/AppNavigator.js';

// export default function App() {
//   return <AppNavigator />;
// }


import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/services/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}