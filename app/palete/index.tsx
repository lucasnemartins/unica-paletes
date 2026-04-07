import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import axios, { AxiosResponse } from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL } from '../config';

interface Pallet {
  Cd_Pallet: string;
  Nm_Pallet: string;
  Vl_Unitario: number;
  editValue: string;
}

const ORDEM_DESEJADA = ['EB', 'EE', 'PC', 'TE', 'AM', 'DD'];

export default function PaleteScreen() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPallets = async () => {
      try {
        setLoading(true);
        const response: AxiosResponse<any[]> = await axios.get(`${API_URL}/api/pallets`);
        const fetched: Pallet[] = response.data.map(p => ({
          Cd_Pallet: p.Cd_Pallet,
          Nm_Pallet: p.Nm_Pallet,
          Vl_Unitario: parseFloat(p.Vl_Unitario) || 0,
          editValue: (parseFloat(p.Vl_Unitario) || 0).toString(),
        }));
        const ordenados = ORDEM_DESEJADA
          .map(code => fetched.find(p => p.Cd_Pallet === code))
          .filter(Boolean) as Pallet[];
        const restantes = fetched.filter(p => !ORDEM_DESEJADA.includes(p.Cd_Pallet));
        setPallets([...ordenados, ...restantes]);
      } catch (error) {
        Alert.alert('Erro', 'Falha ao buscar paletes. Verifique a conexão.');
      } finally {
        setLoading(false);
      }
    };
    fetchPallets();
  }, []);

  const handleSave = async (index: number) => {
    const pallet = pallets[index];
    const novoValor = parseFloat(pallet.editValue.replace(',', '.'));
    if (isNaN(novoValor) || novoValor < 0) {
      Alert.alert('Aviso', 'Insira um valor unitário válido.');
      return;
    }
    try {
      setSaving(pallet.Cd_Pallet);
      await axios.put(`${API_URL}/api/pallets/${pallet.Cd_Pallet}/valor-unitario`, { Vl_Unitario: novoValor });
      const updated = [...pallets];
      updated[index] = { ...updated[index], Vl_Unitario: novoValor, editValue: novoValor.toString() };
      setPallets(updated);
      Alert.alert('Sucesso', `Valor unitário do ${pallet.Cd_Pallet} atualizado.`);
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error || 'Falha ao atualizar valor unitário.');
    } finally {
      setSaving(null);
    }
  };

  const handleEditChange = (index: number, value: string) => {
    const updated = [...pallets];
    updated[index] = { ...updated[index], editValue: value };
    setPallets(updated);
  };

  return (
    <ImageBackground
      source={require('../assets/fundo_sem_logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="white" />
          <Text style={styles.backButtonText}>Menu</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>PALETES</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b8934b" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        )}

        {/* Cabeçalho da tabela */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.codeCell]}>Cód.</Text>
          <Text style={[styles.headerCell, styles.nameCell]}>Nome</Text>
          <Text style={[styles.headerCell, styles.valueCell]}>Vl. Unitário</Text>
          <Text style={[styles.headerCell, styles.actionCell]}></Text>
        </View>

        {pallets.map((pallet, index) => (
          <View key={pallet.Cd_Pallet} style={styles.row}>
            <View style={[styles.cell, styles.codeCell]}>
              <Text style={styles.codeText}>{pallet.Cd_Pallet}</Text>
            </View>

            <View style={[styles.cell, styles.nameCell]}>
              <Text style={styles.nameText} numberOfLines={1}>{pallet.Nm_Pallet}</Text>
            </View>

            <View style={[styles.cell, styles.valueCell]}>
              <TextInput
                style={styles.input}
                value={pallet.editValue}
                onChangeText={v => handleEditChange(index, v)}
                keyboardType="decimal-pad"
                placeholder="€"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.cell, styles.actionCell]}>
              <TouchableOpacity
                style={[styles.saveButton, saving === pallet.Cd_Pallet && { opacity: 0.6 }]}
                onPress={() => handleSave(index)}
                disabled={saving === pallet.Cd_Pallet}
              >
                {saving === pallet.Cd_Pallet
                  ? <ActivityIndicator size="small" color="white" />
                  : <FontAwesome name="check" size={16} color="white" />
                }
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  backButton: {
    position: 'absolute',
    top: 15,
    left: '5%',
    backgroundColor: '#b8934b',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    zIndex: 1,
  },
  backButtonText: { color: 'white', marginLeft: 5, fontWeight: 'bold', fontSize: 16 },
  header: {
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 15,
    elevation: 3,
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: 'black' },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: { marginTop: 10, color: '#b8934b', fontSize: 16, fontWeight: 'bold' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(184, 147, 75, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  headerCell: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  cell: { justifyContent: 'center', alignItems: 'center' },
  codeCell: { width: 50 },
  nameCell: { flex: 1, alignItems: 'flex-start', paddingHorizontal: 6 },
  valueCell: { width: 100 },
  actionCell: { width: 44 },
  codeText: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  nameText: { color: '#444', fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#b8934b',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
});
