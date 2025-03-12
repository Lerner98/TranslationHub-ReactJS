import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from '../screens/HomeScreen';
import TextTranslationScreen from '../screens/TextTranslationScreen';
import VoiceTranslationScreen from '../screens/VoiceTranslationScreen';
import FileTranslationScreen from '../screens/FileTranslationScreen';
import ASLTranslationScreen from '../screens/ASLTranslationScreen';
import ProfileScreen from '../screens/ProfileScreen';

const AppNavigator = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/translate" element={<TextTranslationScreen />} />
      <Route path="/voice" element={<VoiceTranslationScreen />} />
      <Route path="/file" element={<FileTranslationScreen />} />
      <Route path="/asl" element={<ASLTranslationScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/auth" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppNavigator;