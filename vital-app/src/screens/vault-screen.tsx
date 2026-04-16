import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CONFIG } from '@/config';
import { useAuth } from '@/context/auth-context';

const API_URL = `${CONFIG.API_URL}/api/v1/vault`;

interface VaultDocument {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export default function VaultScreen() {
  const { userToken } = useAuth();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    handleBiometricAuth();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      setIsAuthenticating(true);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Erreur', 'L\'authentification biométrique n\'est pas disponible.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accès au Coffre-fort',
        fallbackLabel: 'Utiliser le code',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
        if (userToken) fetchDocuments();
      } else {
        Alert.alert('Accès Refusé', 'Échec de l\'authentification.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/files`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      Alert.alert('Succès', 'Document chiffré et sauvegardé.');
      fetchDocuments();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec du téléchargement.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: VaultDocument) => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${doc.filename}`;
      const response = await fetch(`${API_URL}/download/${doc.id}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Succès', 'Document prêt.');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec du décodage.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Supprimer',
      'Ce document sera définitivement supprimé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userToken}` },
              });
              setDocuments(prev => prev.filter(d => d.id !== id));
            } catch (error) {
              Alert.alert('Erreur', 'Suppression impossible.');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.lockedContainer}>
        <StatusBar barStyle="dark-content" />
        <Animated.View entering={FadeIn.duration(1000)} style={styles.lockedContent}>
          <Ionicons name="finger-print" size={80} color="#1D1D1F" />
          <Text style={styles.lockedTitle}>Coffre-fort Verrouillé</Text>
          <Text style={styles.lockedSub}>Authentifiez-vous pour accéder à vos documents sensibles.</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleBiometricAuth}
            disabled={isAuthenticating}
          >
            <Text style={styles.retryText}>{isAuthenticating ? 'Vérification...' : 'Déverrouiller'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: VaultDocument; index: number }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 50).duration(400)}
      style={styles.card}
    >
      <TouchableOpacity 
        style={styles.cardContent}
        onPress={() => handleDownload(item)}
      >
        <View style={styles.iconContainer}>
            <Ionicons 
                name={item.file_type.includes('pdf') ? 'document-text' : 'image'} 
                size={22} 
                color="#007AFF" 
            />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.filename} numberOfLines={1}>{item.filename}</Text>
          <Text style={styles.metadata}>
            {(item.file_size / 1024).toFixed(1)} KB • {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Coffre-fort</Text>
        <View style={styles.statusBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#34C759" />
            <Text style={styles.statusText}>Sécurisé</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="lock-open-outline" size={40} color="#AEAEB2" />
              </View>
              <Text style={styles.emptyText}>Aucun document</Text>
              <Text style={styles.emptySub}>Vos fichiers chiffrés apparaîtront ici.</Text>
            </View>
          }
        />
      )}

      {uploading && (
        <BlurView intensity={30} style={StyleSheet.absoluteFill}>
          <View style={styles.uploadingOverlay}>
             <ActivityIndicator size="small" color="#007AFF" />
             <Text style={styles.uploadingText}>Chiffrement sécurisé...</Text>
          </View>
        </BlurView>
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleUpload}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 40,
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  lockedContent: {
    alignItems: 'center',
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginTop: 20,
  },
  lockedSub: {
    fontSize: 15,
    color: '#86868B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 40,
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F9E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  filename: {
    color: '#1D1D1F',
    fontSize: 16,
    fontWeight: '600',
  },
  metadata: {
    color: '#86868B',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#1D1D1F',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySub: {
    color: '#86868B',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  uploadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  uploadingText: {
    color: '#007AFF',
    marginTop: 15,
    fontSize: 15,
    fontWeight: '600',
  }
});
