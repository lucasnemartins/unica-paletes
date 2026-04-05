import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ImageBackground, Image, ActivityIndicator, Modal } from 'react-native';
import axios, { AxiosResponse } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-react';
import { API_URL } from '../config';

interface Pallet {
  Cd_Pallet: string;
  Nm_Pallet: string;
  Qt: string | null;
  Valor: string | null;
  UnitValue: number;
}

interface Totals {
  totalQt: number;
  totalValue: number;
}

export default function HomeScreen() {
  const { user, isLoaded } = useUser();
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalQt: 0, totalValue: 0 });
  const [imageUri, setImageUri] = useState<any>(null);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  interface HistoricoCompra {
    id: number;
    data_compra: string;
    Qt_Total: number;
    valor_total: number;
    usuario?: string;
    fonte?: 'atual' | 'historico';
  }
  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState<HistoricoCompra[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [selectedCompraId, setSelectedCompraId] = useState<number | null>(null);
  const [fotosHistorico, setFotosHistorico] = useState<string[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);

  useEffect(() => {
    const fetchPallets = async () => {
      try {
        setLoading(true);
        const response: AxiosResponse<any[]> = await axios.get(`${API_URL}/api/pallets`);
        const fetchedPallets: Pallet[] = response.data.map(pallet => ({
          Cd_Pallet: pallet.Cd_Pallet,
          Nm_Pallet: pallet.Nm_Pallet,
          Qt: null,
          Valor: null,
          UnitValue: pallet.Vl_Unitario,
        }));
        setPallets(fetchedPallets);
      } catch (error) {
        console.error('Erro ao buscar pallets:', error);
        Alert.alert('Erro', 'Falha ao buscar pallets do servidor. Verifique sua conexão e tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    fetchPallets();
  }, []);


  const handleQtChange = (index: number, value: string) => {
    const newPallets = [...pallets];
    const qt = parseFloat(value) || null;
    newPallets[index].Qt = qt !== null ? qt.toString() : null;
    newPallets[index].Valor = qt !== null ? (qt * newPallets[index].UnitValue).toFixed(2) : null;
    setPallets(newPallets);
  };

  const handleValueChange = (index: number, value: string) => {
    const newPallets = [...pallets];
    newPallets[index].Valor = value;
    setPallets(newPallets);
  };

  useEffect(() => {
    const newTotals: Totals = pallets.reduce((acc, pallet) => {
      const qt = parseFloat(pallet.Qt || '0') || 0;
      const value = parseFloat(pallet.Valor || '0') || 0;
      return {
        totalQt: acc.totalQt + qt,
        totalValue: acc.totalValue + value,
      };
    }, { totalQt: 0, totalValue: 0 });

    setTotals(newTotals);
  }, [pallets]);

  const handleSubmit = async () => {
    const nomeParts = [user?.firstName, user?.lastName].filter(Boolean);
    const primaryEmail = user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
      || user?.emailAddresses?.[0]?.emailAddress;
    const nomeUsuario = nomeParts.length > 0
      ? nomeParts.join(' ')
      : (primaryEmail || user?.id || 'Desconhecido');
    try {
      setLoading(true);
      const palletsToSend: Pallet[] = pallets
        .filter(pallet => pallet.Qt !== null && pallet.Valor !== null)
        .map(pallet => ({
          ...pallet,
          Qt: pallet.Qt === '' ? null : pallet.Qt,
          Valor: pallet.Valor === '' ? null : pallet.Valor,
        }));

      if (palletsToSend.length === 0) {
        Alert.alert('Aviso', 'Nenhum pallet com dados para enviar');
        return;
      }

      // 1. Salvar compra
      const response: AxiosResponse<{ message: string; id_compra: number }> = await axios.post(`${API_URL}/api/compras`, { pallets: palletsToSend, usuario: nomeUsuario }, {
        headers: { 'Content-Type': 'application/json' },
      });
      const idCompra = response.data.id_compra;
      setPurchaseId(idCompra);

      // 2. Enviar fotos pendentes automaticamente (se houver)
      if (pendingPhotos.length > 0) {
        const photosToUpload = [...pendingPhotos];
        setPendingPhotos([]);
        for (const uri of photosToUpload) {
          await uploadImage(uri, idCompra, false);
        }
        Alert.alert('Sucesso', `Compra registrada e ${photosToUpload.length} foto(s) enviada(s)!`);
      } else {
        Alert.alert('Sucesso', response.data.message);
      }

      // 3. Limpar formulário
      setPhotos([]);
      const resetPallets: Pallet[] = pallets.map(pallet => ({ ...pallet, Qt: null, Valor: null }));
      setPallets(resetPallets);
    } catch (error: any) {
      console.error('Erro ao enviar os dados:', error);
      if (error.response) {
        Alert.alert('Erro', `Falha ao enviar os dados: ${error.response.data.message}`);
      } else if (error.request) {
        Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
      } else {
        Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.5,
        mediaTypes: ['images'],
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;
        if (pendingPhotos.length < 3) {
          setPendingPhotos(prev => [...prev, dataUri]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
        }
      }
    } catch (err: any) {
      console.error('Erro ao capturar foto:', err);
      Alert.alert('Erro', `Não foi possível capturar a foto: ${err.message}`);
    }
  };

  const uploadImage = async (uri: string, idOverride?: number, showAlert: boolean = true) => {
    let uploadUri = uri;
    const idCompra = idOverride ?? purchaseId;
    if (!idCompra) {
      Alert.alert('Atenção', 'Finalize a compra antes de enviar as fotos.');
      return;
    }
    try {
      setLoading(true);
      const uploadUrl = `${API_URL}/api/compras/${idCompra}/foto`;
      
      // Para ambiente web, a URI já está em base64
      const base64Data = uri;
      
      // Preparar o corpo da requisição
      const body = {
        photo: base64Data,
        quantidade: totals.totalQt.toString(),
        valor: totals.totalValue.toString()
      };
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status}`);
      }
      
      const data = await response.json();
      setPhotos(prev => [...prev, data.url]);
      if (showAlert) Alert.alert('Sucesso', 'Foto enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro no uploadImage:', err);
      Alert.alert('Erro ao enviar imagem', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!purchaseId) return;
    try {
      const response = await axios.get(`${API_URL}/api/mongo/compras/${purchaseId}/fotos`);
      const urls = response.data.map((f: any) =>
        f.url.startsWith('/api/') ? `${API_URL}${f.url}` : f.url
      );
      setPhotos(urls);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      Alert.alert('Erro', 'Falha ao buscar fotos da compra.');
    }
  };

  // Função de verificação de uploads no MongoDB
  const verifyUpload = async () => {
    if (!purchaseId) return;
    try {
      setLoading(true);
      // Agora busca o documento de compra completo com o array photos
      const res = await axios.get(`${API_URL}/api/mongo/compras/${purchaseId}`);
      console.log('CompraDoc no MongoDB:', res.data);
      // Exibe apenas o array de URLs
      Alert.alert('Photos da Compra', JSON.stringify(res.data.photos, null, 2));
    } catch (err: any) {
      console.error('Erro ao verificar compra no MongoDB:', err);
      Alert.alert('Erro ao verificar compra', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async () => {
    try {
      setLoadingHistorico(true);
      const response = await axios.get(`${API_URL}/api/compras/historico`);
      setHistorico(response.data);
      setShowHistorico(true);
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao buscar histórico de compras.');
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fetchFotosHistorico = async (idCompra: number) => {
    try {
      setLoadingFotos(true);
      setSelectedCompraId(idCompra);
      setFotosHistorico([]);
      const response = await axios.get(`${API_URL}/api/mongo/compras/${idCompra}/fotos`);
      const urls = response.data.map((f: any) =>
        f.url.startsWith('/api/') ? `${API_URL}${f.url}` : f.url
      );
      setFotosHistorico(urls);
      if (urls.length === 0) {
        Alert.alert('Sem fotos', 'Nenhuma foto encontrada para esta compra.');
      }
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao buscar fotos.');
    } finally {
      setLoadingFotos(false);
    }
  };

  // Envia todas as fotos pendentes ao servidor
  const uploadAllPhotos = async () => {
    console.log('▶️ uploadAllPhotos chamado', { purchaseId, pendingPhotos });
    if (!purchaseId) {
      Alert.alert('Atenção', 'Finalize a compra antes de enviar as fotos.');
      return;
    }
    // Inicia o loading e prepara cópia das fotos pendentes para envio
    try {
      setLoading(true);
      const photosToUpload = [...pendingPhotos];
      setPendingPhotos([]);
      // Envio sequencial para cada foto usar toda a conexão disponível
      for (const uriToUpload of photosToUpload) {
        await uploadImage(uriToUpload, purchaseId!, false);
      }
      Alert.alert('Sucesso', 'Todas as fotos foram enviadas!');
      // Limpa as fotos enviadas do front-end
      setPhotos([]);
    } catch (err: any) {
      console.error('Erro ao enviar todas as fotos:', err);
      Alert.alert('Erro', `Falha ao enviar fotos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    const confirmado = window.confirm('Limpar todas as quantidades e fotos preenchidas?');
    if (confirmado) {
      setPallets(prev => prev.map(p => ({ ...p, Qt: null, Valor: null })));
      setPendingPhotos([]);
      setPhotos([]);
      setPurchaseId(null);
    }
  };

  const goBackToMenu = () => {
    router.back();
  };

  return (
    <ImageBackground
      source={require('../assets/fundo_sem_logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        ref={scrollViewRef}
      >
        <TouchableOpacity
          style={styles.backToMenuButton}
          onPress={goBackToMenu}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
          <Text style={styles.backToMenuButtonText}>Menu</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>COMPRA</Text>
          {isLoaded && (
            <View style={styles.userBadge}>
              <FontAwesome name="user" size={14} color="#b8934b" />
              <Text style={styles.loggedInUser}>
                {user?.firstName
                  || user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
                  || user?.emailAddresses?.[0]?.emailAddress
                  || user?.id
                  || ''}
              </Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b8934b" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        )}

        {pallets.map((pallet, index) => (
          <View key={index} style={styles.palletRow}>
            <View style={[styles.inputWrapper, styles.codeWrapper]}>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={pallet.Cd_Pallet}
                editable={false}
              />
            </View>

            <View style={[styles.inputWrapper, styles.nameWrapper]}>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={pallet.Nm_Pallet}
                editable={false}
              />
            </View>

            <View style={[styles.inputWrapper, styles.qtWrapper]}>
              <TextInput
                style={styles.input}
                value={pallet.Qt === null ? '' : pallet.Qt}
                onChangeText={(t) => handleQtChange(index, t)}
                keyboardType="numeric"
                placeholder="Qtd"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.inputWrapper, styles.valueWrapper]}>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={pallet.Valor === null ? '' : pallet.Valor}
                onChangeText={(t) => handleValueChange(index, t)}
                keyboardType="decimal-pad"
                placeholder="€"
                placeholderTextColor="#999"
                editable={false}
              />
            </View>
          </View>
        ))}

        <View style={styles.totalsContainer}>
          <View style={[styles.inputWrapper, styles.totalLabelWrapper]}>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value="TOTAL"
              editable={false}
            />
          </View>

          <View style={[styles.inputWrapper, styles.totalQtWrapper]}>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={totals.totalQt.toString()}
              editable={false}
            />
          </View>

          <View style={[styles.inputWrapper, styles.totalValueWrapper]}>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={`${totals.totalValue.toFixed(2)}`}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {/* Ações: Finalizar Compra, Tirar Foto, Enviar Fotos */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={[styles.button, styles.leftButton]} onPress={handleSubmit} disabled={loading}>
              <FontAwesome name="check-circle" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.buttonText}>Finalizar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, pendingPhotos.length >= 3 && { opacity: 0.5 }]}
              onPress={takePhoto}
              disabled={loading || pendingPhotos.length >= 3}
            >
              <FontAwesome name="camera" size={20} color="white" style={{ marginRight: 5 }} />
              <Text style={styles.buttonText}>Foto ({pendingPhotos.length}/3)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleLimpar} disabled={loading}>
              <FontAwesome name="trash" size={18} color="white" />
            </TouchableOpacity>
          </View>
          {pendingPhotos.length > 0 && (
            <View style={styles.galleryContainer}>
              {pendingPhotos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.galleryItem}
                  onPress={() => setPendingPhotos(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <ImageBackground source={{ uri }} style={{ flex: 1 }} resizeMode="cover">
                    <View style={styles.removeIconContainer}>
                      <Text style={styles.removeIcon}>×</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Fotos pendentes são enviadas automaticamente ao Finalizar Compra */}
          {pendingPhotos.length > 0 && (
            <Text style={styles.pendingPhotosHint}>
              {pendingPhotos.length} foto(s) será(ão) enviada(s) ao finalizar
            </Text>
          )}
          {/* Exibe fotos enviadas já salvas no MongoDB */}
          {photos.length > 0 && (
            <View style={styles.uploadedPhotosContainer}>
              {photos.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.uploadedPhoto}
                />
              ))}
            </View>
          )}
        </View>

        {/* Botão Histórico de Compras */}
        <TouchableOpacity
          style={[styles.button, styles.historicoButton]}
          onPress={fetchHistorico}
          disabled={loadingHistorico}
        >
          <FontAwesome name="history" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>
            {loadingHistorico ? 'Carregando...' : 'Histórico de Compras'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Histórico */}
      <Modal visible={showHistorico} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Histórico de Compras</Text>
              <TouchableOpacity onPress={() => { setShowHistorico(false); setSelectedCompraId(null); setFotosHistorico([]); }}>
                <FontAwesome name="times" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {historico.map((compra) => (
                <TouchableOpacity
                  key={compra.id}
                  style={[styles.historicoItem, selectedCompraId === compra.id && styles.historicoItemSelected]}
                  onPress={() => fetchFotosHistorico(compra.id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={styles.historicoData}>
                        {new Date(compra.data_compra).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                        {new Date(compra.data_compra).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={[styles.fonteBadge, compra.fonte === 'historico' && styles.fonteBadgeHistorico]}>
                        <Text style={styles.fonteBadgeText}>
                          {compra.fonte === 'historico' ? 'Histórico' : 'Sessão atual'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historicoInfo}>
                      {compra.Qt_Total} paletes · € {Number(compra.valor_total).toFixed(2)}
                    </Text>
                    {compra.usuario && (
                      <Text style={styles.historicoUsuario}>👤 {compra.usuario}</Text>
                    )}
                  </View>
                  <FontAwesome name="camera" size={16} color="#b8934b" />
                </TouchableOpacity>
              ))}

              {/* Fotos da compra selecionada */}
              {selectedCompraId && (
                <View style={styles.fotosSection}>
                  <Text style={styles.fotosSectionTitle}>
                    Fotos da Compra #{selectedCompraId}
                  </Text>
                  {loadingFotos ? (
                    <ActivityIndicator color="#b8934b" style={{ marginVertical: 20 }} />
                  ) : fotosHistorico.length > 0 ? (
                    <View style={styles.fotosGrid}>
                      {fotosHistorico.map((url, idx) => (
                        <TouchableOpacity key={idx} onPress={() => setFotoExpandida(url)} activeOpacity={0.85}>
                          <Image source={{ uri: url }} style={styles.fotoHistorico} resizeMode="cover" />
                          <View style={styles.fotoOverlay}>
                            <FontAwesome name="search-plus" size={18} color="white" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.semFotosText}>Nenhuma foto disponível</Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Lightbox — foto expandida */}
      <Modal visible={!!fotoExpandida} transparent animationType="fade" onRequestClose={() => setFotoExpandida(null)}>
        <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setFotoExpandida(null)}>
          <Image
            source={{ uri: fotoExpandida ?? '' }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setFotoExpandida(null)}>
            <FontAwesome name="times-circle" size={36} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  header: { backgroundColor: 'white', paddingVertical: 20, marginBottom: 15, elevation: 3, position: 'relative', alignItems: 'center', paddingLeft: 25, paddingRight: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'black', textAlign: 'center' },
  inputsContainer: { paddingHorizontal: 10, marginBottom: 15 },
  palletRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: 10, padding: 10, marginLeft: 10, marginRight: 10 },
  totalsContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: 10, padding: 10, marginHorizontal: 10, marginBottom: 15 },
  inputWrapper: { justifyContent: 'center' },
  codeWrapper: { width: 50 },
  nameWrapper: { width: 120 },
  qtWrapper: { width: 80 },
  valueWrapper: { width: 100 },
  totalLabelWrapper: { width: 100 },
  totalQtWrapper: { width: 60, marginLeft: 70 },
  totalValueWrapper: { width: 100 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', fontSize: 16 },
  disabledInput: { backgroundColor: 'rgba(245, 245, 245, 0.9)', color: '#333' },
  buttonContainer: { alignItems: 'center' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  button: { backgroundColor: '#b8934b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, elevation: 5, marginHorizontal: 5, flexDirection: 'row', alignItems: 'center' },
  leftButton: { marginRight: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  backToMenuButton: {
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
  backToMenuButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    color: '#b8934b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  galleryItem: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  removeIconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 2,
  },
  removeIcon: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  uploadedPhotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  uploadedPhoto: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
  },
  clearButton: {
    backgroundColor: '#c0392b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingPhotosHint: {
    textAlign: 'center',
    color: '#b8934b',
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 6,
  },
  historicoButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#7a6030',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historicoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9f5ee',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0d5c0',
  },
  historicoItemSelected: {
    borderColor: '#b8934b',
    backgroundColor: '#fdf4e3',
  },
  historicoData: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  historicoInfo: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  historicoUsuario: {
    fontSize: 12,
    color: '#b8934b',
    marginTop: 2,
  },
  fonteBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fonteBadgeHistorico: {
    backgroundColor: '#fff3e0',
  },
  fonteBadgeText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
  },
  userBadge: {
    position: 'absolute',
    right: 16,
    top: '50%' as any,
    transform: [{ translateY: -10 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  loggedInUser: {
    fontSize: 14,
    color: '#b8934b',
    fontWeight: '500',
  },
  fotosSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  fotosSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b8934b',
    marginBottom: 12,
  },
  fotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fotoHistorico: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  semFotosText: {
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
  },
  fotoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 4,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '95%',
    height: '80%',
    borderRadius: 8,
  },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
  },
});