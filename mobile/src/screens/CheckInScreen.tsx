import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useContractStore } from '../store/useContractStore';

export default function CheckInScreen({ route, navigation }: any) {
  const { contractId } = route.params || {};
  const { uploadCheckinPhotos, completeCheckin, isLoading } = useContractStore();
  const [rooms, setRooms] = useState([
    { id: 'living_room', name: 'סלון', photos: [] as string[] },
    { id: 'kitchen', name: 'מטבח', photos: [] as string[] },
    { id: 'bedroom', name: 'חדר שינה', photos: [] as string[] },
  ]);

  const handleAddPhoto = (roomId: string) => {
    // Simulate photo capturing
    const mockPhotoUri = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400';
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, photos: [...room.photos, mockPhotoUri] };
      }
      return room;
    }));
    Alert.alert('תמונה נוספה', 'הצילום נוסף בהצלחה לרשימת תמונות החדר.');
  };

  const handleSave = async () => {
    try {
      await completeCheckin(contractId || 'mock-id');
      Alert.alert('צ׳ק אין הושלם', 'כל התמונות הועלו בהצלחה וסטטוס הדירה תועד במלואה.', [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('שגיאה', 'שמירת הצ׳ק אין נכשלה.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>תיעוד מצב דירה (Check-In)</Text>
      <Text style={styles.subtitle}>נא לצלם ולתעד את מצב החדרים לפני הכניסה בפועל לדירה.</Text>

      {rooms.map(room => (
        <View key={room.id} style={styles.roomCard}>
          <View style={styles.roomHeader}>
            <TouchableOpacity onPress={() => handleAddPhoto(room.id)} style={styles.addPhotoBtn}>
              <Text style={styles.addPhotoText}>+ הוסף צילום</Text>
            </TouchableOpacity>
            <Text style={styles.roomName}>{room.name}</Text>
          </View>

          {room.photos.length > 0 ? (
            <ScrollView horizontal style={styles.photoList} contentContainerStyle={styles.photoListContent}>
              {room.photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={styles.photo} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotosBox}>
              <Text style={styles.noPhotosText}>אין תמונות מתועדות עבור חדר זה</Text>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>אשר והשלם צ׳ק-אין</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111e',
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#9aa0b9',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 30,
  },
  roomCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  addPhotoBtn: {
    backgroundColor: 'rgba(95, 92, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(95, 92, 229, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addPhotoText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '700',
  },
  photoList: {
    marginTop: 8,
  },
  photoListContent: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noPhotosBox: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  noPhotosText: {
    color: '#9aa0b9',
    fontSize: 12,
  },
  saveBtn: {
    marginTop: 20,
    height: 54,
    backgroundColor: '#5f5ce5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
