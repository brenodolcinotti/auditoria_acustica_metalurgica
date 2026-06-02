import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  const [sound, setSound] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordedSound, setRecordedSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const soundRef = useRef(null);
  const recordedSoundRef = useRef(null);

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldRouteThroughEarpieceAndroid: false,
        });

        const { sound: playbackObject } = await Audio.Sound.createAsync(
          require('./assets/560446music.mp3')
        );

        playbackObject.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
          }
        });

        soundRef.current = playbackObject;
        setSound(playbackObject);
      } catch (error) {
        Alert.alert(
          'Erro',
          'Não foi possível carregar o arquivo de áudio inicial.'
        );
      }
    }

    setupAudio();

    return () => {
      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
          }

          if (recordedSoundRef.current) {
            await recordedSoundRef.current.unloadAsync();
          }
        } catch (error) {
          console.log(error);
        }
      })();
    };
  }, []);

  async function togglePlaySound() {
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();

      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
        } else {
          if (
            status.durationMillis &&
            status.positionMillis >= status.durationMillis
          ) {
            await sound.setPositionAsync(0);
          }

          await sound.playAsync();
        }
      }
    } catch (error) {
      console.log('Erro ao reproduzir áudio:', error);
    }
  }

  async function toggleLoop() {
    if (!sound) return;

    try {
      const novoEstado = !isLooping;
      await sound.setIsLoopingAsync(novoEstado);
      setIsLooping(novoEstado);
    } catch (error) {
      console.log(error);
    }
  }

  async function unloadSound() {
    if (!sound) return;

    try {
      await sound.stopAsync();
      await sound.unloadAsync();

      soundRef.current = null;

      setSound(null);
      setIsPlaying(false);
      setIsLooping(false);
    } catch (error) {
      console.log(error);
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      try {
        await recording.stopAndUnloadAsync();

        const uri = recording.getURI();

        setRecording(null);
        setIsRecording(false);

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldRouteThroughEarpieceAndroid: false,
        });

        if (recordedSoundRef.current) {
          await recordedSoundRef.current.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync({
          uri,
        });

        recordedSoundRef.current = newSound;
        setRecordedSound(newSound);

        Alert.alert(
          'Gravação concluída',
          `Arquivo salvo:\n${uri}`
        );
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        const { granted } =
          await Audio.requestPermissionsAsync();

        if (!granted) {
          Alert.alert(
            'Permissão negada',
            'Habilite o microfone nas configurações.'
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldRouteThroughEarpieceAndroid: false,
        });

        const { recording: rec } =
          await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );

        setRecording(rec);
        setIsRecording(true);
      } catch (error) {
        console.log(error);
      }
    }
  }

  async function playRecordedSound() {
    if (!recordedSound) return;

    try {
      await recordedSound.replayAsync();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          !sound && styles.disabledButton,
        ]}
        onPress={togglePlaySound}
        disabled={!sound}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? '⏸ Pausar Som' : '▶ Tocar Som'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          !sound && styles.disabledButton,
        ]}
        onPress={toggleLoop}
        disabled={!sound}
      >
        <Text style={styles.buttonText}>
          {isLooping
            ? '🔁 Desativar Loop'
            : '🔂 Ativar Loop'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          !sound && styles.disabledButton,
        ]}
        onPress={unloadSound}
        disabled={!sound}
      >
        <Text style={styles.buttonText}>
          🗑 Descarregar Som
        </Text>
      </TouchableOpacity>

      <View style={styles.separator} />

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isRecording
              ? '#dc3545'
              : '#28a745',
          },
        ]}
        onPress={toggleRecording}
      >
        <Text style={styles.buttonText}>
          {isRecording
            ? '⏹ Parar Gravação'
            : '🎙 Gravar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          !recordedSound && styles.disabledButton,
        ]}
        onPress={playRecordedSound}
        disabled={!recordedSound}
      >
        <Text style={styles.buttonText}>
          ▶ Reproduzir Gravação
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    gap: 12,
  },

  separator: {
    height: 20,
  },

  button: {
    width: 250,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',

    elevation: 4,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  disabledButton: {
    backgroundColor: '#bdbdbd',
    elevation: 0,
    shadowOpacity: 0,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});