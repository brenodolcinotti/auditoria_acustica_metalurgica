import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  // Estados de Controle
  const [sound, setSound] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordedSound, setRecordedSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Configuração inicial e Limpeza de Memória
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
          require('./assets/audio.mp3') // Verifique se o nome do arquivo está correto na pasta assets
        );

        playbackObject.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
          }
        });
        
        setSound(playbackObject);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar o arquivo de áudio inicial.');
      }
    }

    setupAudio();

    // Tarefa 1: Função de Limpeza (Descarrega memória no unmount)
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recordedSound) {
        recordedSound.unloadAsync();
      }
    };
  }, []);

  // Função para recarregar o áudio base manualmente após ter sido descarregado
  async function loadSound() {
    try {
      const { sound: playbackObject } = await Audio.Sound.createAsync(
        require('./assets/audio.mp3')
      );
      
      playbackObject.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
        }
      });
      
      setSound(playbackObject);
    } catch (error) {
      console.log("Erro ao recarregar o áudio:", error);
    }
  }

  // Tarefa 4: Controle de Navegação do Áudio Base
  async function togglePlaySound() {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
        } else {
          // Se o som já terminou: volta o ponteiro para o início (0 milissegundos)
          if (status.positionMillis >= status.durationMillis) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
        }
      }
    } catch (error) {
      console.log("Erro ao alternar play/pause: ", error);
    }
  }

  // Ativa/desativa loop do áudio base
  async function toggleLoop() {
    if (!sound) return;
    try {
      await sound.setIsLoopingAsync(!isLooping);
      setIsLooping(!isLooping);
    } catch (error) {
      console.log(error);
    }
  }

  // Descarrega o som base da memória e desabilita interface
  async function unloadSound() {
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setIsLooping(false); // Reseta o status visual do loop
    } catch (error) {
      console.log(error);
    }
  }

  // Tarefa 2: Sincronização Estrita de Modos de Áudio para Gravação
  async function toggleRecording() {
    if (isRecording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setIsRecording(false);

        // Desativa modo de gravação para liberar reprodução limpa nos alto-falantes
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        setRecordedSound(newSound);
        Alert.alert('Gravação Salva', 'Use o botão abaixo para reproduzir a anomalia acústica.');
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Permissão negada', 'Habilite o microfone nas configurações.');
          return;
        }
        
        // Ativa modo estrito de gravação
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: rec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(rec);
        setIsRecording(true);
      } catch (error) {
        console.log(error);
      }
    }
  }

  // Reproduz o áudio que o técnico acabou de gravar (Auditoria)
  async function playRecordedSound() {
    if (!recordedSound) return;
    try {
      await recordedSound.replayAsync();
    } catch (error) {
      console.log(error);
    }
  }

  // Tarefa 3: Lógica Condicional de Interface UI/UX
  return (
    <View style={styles.container}>
      
      {/* Lógica Condicional: Se tem som na memória, mostra os controles. Se não tem, mostra o botão de Carregar */}
      {sound ? (
        <>
          <TouchableOpacity style={styles.button} onPress={togglePlaySound}>
            <Text style={styles.buttonText}>{isPlaying ? 'Pausar' : 'Tocar'} Áudio Base</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={toggleLoop}>
            <Text style={styles.buttonText}>{isLooping ? 'Loop: ON' : 'Loop: OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={unloadSound}>
            <Text style={styles.buttonText}>Descarregar Som</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.button} onPress={loadSound}>
          <Text style={styles.buttonText}>Carregar Áudio Base</Text>
        </TouchableOpacity>
      )}

      <View style={styles.separator} />

      {/* Controles de Auditoria (Gravação no Chão de Fábrica) */}
      <TouchableOpacity
        style={[styles.button, isRecording ? styles.recordingActive : styles.recordingInactive]}
        onPress={toggleRecording}
      >
        <Text style={styles.buttonText}>{isRecording ? '⏹ Parar Gravação' : '🎙 Gravar'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !recordedSound && styles.disabledButton]}
        onPress={playRecordedSound}
        disabled={!recordedSound}
      >
        <Text style={styles.buttonText}>Reproduzir Captura</Text>
      </TouchableOpacity>
      
    </View>
  );
}

// Estilização do Aplicativo
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#252525',
  },
  separator: {
    height: 20,
  },
  button: {
    width: 220,
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  recordingInactive: {
    backgroundColor: '#2e7d32', // Verde indicando pronto para gravar
  },
  recordingActive: {
    backgroundColor: '#d32f2f', // Vermelho indicando gravação em andamento
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});