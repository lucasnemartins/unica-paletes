 // ==========================================================================
 // ARQUIVO: frontend/AdjustInventoryScreen.tsx (DROPDOWN, INFO COM NOME COLUNA, EURO, TRATA NaN E NULL)
 // ==========================================================================

 import React, { useState, useEffect } from 'react';
 import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ImageBackground } from 'react-native';
 import axios, { AxiosResponse } from 'axios';
 import { useRouter } from 'expo-router';
 import { FontAwesome } from '@expo/vector-icons';
 import { API_URL } from '../config';

 interface EstoqueItem {
  Cd_Pallet: string;
  Nm_Pallet: string;
  Qt_Estoque: string | null;
  Vl_Unitario: string | null;
  Valor_Estoque: string | null;
 }

 interface AjusteEstoque {
  Cd_Pallet: string;
  Qt_Ajuste: string;
 }

 interface PalletDetails {
  Cd_Pallet: string;
  Nm_Pallet: string;
  Vl_Unitario: string | null;
  Qt_Estoque: string | null;
 }

 export default function AdjustInventoryScreen() {
  const [selectedCdPallet, setSelectedCdPallet] = useState<string | null>(null);
  const [cdPalletInput, setCdPalletInput] = useState('');
  const [estoqueInfo, setEstoqueInfo] = useState<EstoqueItem | null>(null); // Inicializado como null
  const [qtAjuste, setQtAjuste] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availablePallets, setAvailablePallets] = useState<PalletDetails[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const router = useRouter();
  const goBackToMenu = () => {
    router.back();
  };

  useEffect(() => {
   const fetchAvailablePallets = async () => {
    setLoading(true);
    setError('');
    try {
     const response: AxiosResponse<PalletDetails[]> = await axios.get(`${API_URL}/api/pallets`);
     console.log('FRONTEND: GET /api/pallets response in AdjustInventory:', response.data);
     setAvailablePallets(response.data);
    } catch (err: any) {
     console.error('FRONTEND: Error fetching available pallets in AdjustInventory:', err);
     setError('Erro ao carregar a lista de pallets.');
    } finally {
     setLoading(false);
    }
   };

   fetchAvailablePallets();
  }, []);

  useEffect(() => {
   if (selectedCdPallet) {
    setCdPalletInput(selectedCdPallet);
    fetchEstoqueDetails(selectedCdPallet);
   } else if (!cdPalletInput) {
    setEstoqueInfo(null); // Reset para null quando o input é limpo
    setQtAjuste('');
   }
  }, [selectedCdPallet, cdPalletInput]);

  const formatEuro = (value: string | null): string => {
   if (value === null || isNaN(parseFloat(value))) {
    return '';
   }
   return `€ ${parseFloat(value).toFixed(2)}`;
  };

  const formatNumber = (value: string | null): string => {
   if (value === null || isNaN(parseFloat(value))) {
    return '';
   }
   return value.toString();
  };

  const fetchEstoqueDetails = async (cdPallet: string) => {
   if (!cdPallet) {
    setEstoqueInfo(null);
    setQtAjuste('');
    return;
   }

   setLoading(true);
   setError('');
   const apiUrl = `${API_URL}/api/estoque-details/${cdPallet}`;
   console.log('FRONTEND: GET /api/estoque-details/' + cdPallet + '...');

   try {
    const response: AxiosResponse<EstoqueItem> = await axios.get(apiUrl);
    console.log('FRONTEND: GET /api/estoque-details/' + cdPallet + ' response:', response.data);
    setEstoqueInfo(response.data);
    setQtAjuste(''); // Limpa o campo de ajuste ao carregar os detalhes
   } catch (err: any) {
    console.error('FRONTEND: Error fetching estoque details:', err);
    setEstoqueInfo(null);
    setQtAjuste('');
    setError('Pallet não encontrado no estoque.');
    if (err.response) {
     console.error('FRONTEND: Estoque details error details:', err.response.data);
     if (err.response.status === 404) {
      setError('Pallet não encontrado.');
     } else {
      setError('Falha ao buscar detalhes do estoque.');
     }
    } else {
     setError('Falha ao buscar detalhes do estoque.');
    }
   } finally {
    setLoading(false); 
   }
  };

  const handleCdPalletChangeText = (text: string) => {
   setCdPalletInput(text);
   setSelectedCdPallet(null); // Limpar seleção ao digitar
   setEstoqueInfo(null); // Limpar informações ao digitar
  };

  const handleQtAjusteChange = (text: string) => {
   setQtAjuste(text);
  };

  const handleAdjustEstoque = async () => {
   if (!selectedCdPallet || qtAjuste === '') {
    Alert.alert('Atenção', 'Por favor, selecione o código do pallet e digite a quantidade de ajuste.');
    return;
   }

   const ajusteData: AjusteEstoque = {
    Cd_Pallet: selectedCdPallet,
    Qt_Ajuste: qtAjuste,
   };

   console.log("FRONTEND: Dados de ajuste enviados:", ajusteData);

   setLoading(true);
   setError('');
   try {
    const response: AxiosResponse<{ message: string }> = await axios.post(
     `${API_URL}/api/adjust-estoque`,
     ajusteData,
     {
      headers: {
       'Content-Type': 'application/json',
      },
     }
    );
    Alert.alert('Sucesso', response.data.message);
    fetchEstoqueDetails(selectedCdPallet); // Atualiza os detalhes após o ajuste
    setQtAjuste(''); // Limpa o campo de ajuste
   } catch (err: any) {
    console.error('FRONTEND: Error adjusting estoque:', err);
    setError('Falha ao ajustar o estoque.');
    if (err.response) {
     Alert.alert('Erro', `Falha ao ajustar o estoque: ${err.response.data.message}`);
    } else {
     Alert.alert('Erro', 'Falha ao ajustar o estoque.');
    }
   } finally {
    setLoading(false);
   }
  };

  const handleCdPalletSelectCustom = (itemValue: string) => {
   setSelectedCdPallet(itemValue);
   setCdPalletInput(itemValue);
   fetchEstoqueDetails(itemValue);
   setIsDropdownVisible(false);
  };

  const toggleDropdown = () => {
   setIsDropdownVisible(!isDropdownVisible);
  };

  return (
   <ImageBackground
    source={require('../assets/fundo_sem_logo.png')}
    style={styles.background}
    resizeMode="cover"
   >
    <ScrollView contentContainerStyle={styles.scrollContainer}>
         {/* Botão "Voltar ao Menu" no centro superior esquerdo */}
        <TouchableOpacity
          style={styles.backToMenuButton}
          onPress={goBackToMenu}
         >
          <FontAwesome name="arrow-left" size={20} color="white" />
          <Text style={styles.backToMenuButtonText}>Menu</Text>
         </TouchableOpacity>
     <View style={styles.header}>
      <Text style={styles.title}>INVENTÁRIO</Text>
     </View>

     <View style={styles.container}>
      <View style={[styles.inputRow, { zIndex: 100 }]}>
       <View style={[styles.inputWrapper, { zIndex: 100 }]}>
        <Text style={styles.label}>Cd Pallet:</Text>
        <TouchableOpacity style={styles.customDropdownTrigger} onPress={() => setIsDropdownVisible(!isDropdownVisible)}>
          <Text style={styles.customDropdownText}>{selectedCdPallet || 'Selecionar...'}</Text>
          <FontAwesome name={isDropdownVisible ? 'chevron-up' : 'chevron-down'} size={12} color="#666" />
        </TouchableOpacity>
        {isDropdownVisible && (
          <View style={styles.customDropdownListContainer}>
            <ScrollView style={styles.customDropdownList} nestedScrollEnabled>
              <TouchableOpacity
                style={styles.customDropdownItem}
                onPress={() => {
                  setSelectedCdPallet(null);
                  setCdPalletInput('');
                  setEstoqueInfo(null);
                  setIsDropdownVisible(false);
                }}
              >
                <Text style={{ color: '#999' }}>Selecionar...</Text>
              </TouchableOpacity>
              {availablePallets.map((pallet) => (
                <TouchableOpacity
                  key={pallet.Cd_Pallet}
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setSelectedCdPallet(pallet.Cd_Pallet);
                    setCdPalletInput(pallet.Cd_Pallet);
                    fetchEstoqueDetails(pallet.Cd_Pallet);
                    setIsDropdownVisible(false);
                  }}
                >
                  <Text style={styles.customDropdownItemText}>{pallet.Cd_Pallet}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
       </View>
       <View style={[styles.inputWrapper, { zIndex: 1 }]}>
        <Text style={styles.label}>Nome Pallet:</Text>
        <TextInput
         style={[styles.input, styles.disabledInput]}
         value={estoqueInfo?.Nm_Pallet || ''}
         editable={false}
         placeholder="Nome Pallet"
         placeholderTextColor="#999"
        />
       </View>
      </View>

      <View style={[styles.inputRow, { zIndex: 1 }]}>
       <View style={styles.inputWrapper}>
        <Text style={styles.label}>Estoque Atual:</Text>
        <TextInput
            style={[styles.input, styles.disabledInput]}
            value={formatNumber(estoqueInfo?.Qt_Estoque ?? null)} // Usando o operador de coalescência nula
            editable={false}
            placeholder="Estoque Atual"
             placeholderTextColor="#999"
 />
       </View>
       <View style={styles.inputWrapper}>
        <Text style={styles.label}>Valor Unitário:</Text>
        <TextInput
         style={[styles.input, styles.disabledInput]}
         value={formatNumber(estoqueInfo?.Vl_Unitario ?? null)} // Usando optional chaining
         editable={false}
         placeholder="Valor Unitário"
         placeholderTextColor="#999"
        />
       </View>
      </View>

      <View style={[styles.inputRow, { zIndex: 1 }]}>
       <View style={styles.inputWrapper}>
        <Text style={styles.label}>Valor Estoque:</Text>
        <TextInput
         style={[styles.input, styles.disabledInput]}
         value={formatEuro(estoqueInfo?.Valor_Estoque ?? null)} // Usando optional chaining
         editable={false}
         placeholder="Valor Estoque"
         placeholderTextColor="#999"
        />
       </View>
       <View style={styles.inputWrapper}>
        <Text style={styles.label}>Qtd. Ajuste:</Text>
        <TextInput
         style={styles.input}
         value={qtAjuste}
         onChangeText={handleQtAjusteChange}
         placeholder="Digite a quantidade"
         keyboardType="numeric"
         placeholderTextColor="#999"
        />
       </View>
      </View>

      {loading && availablePallets.length > 0 && <Text>Carregando detalhes do pallet...</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {estoqueInfo && (
       <TouchableOpacity style={styles.adjustButton} onPress={handleAdjustEstoque}>
        <Text style={styles.adjustButtonText}>AJUSTAR ESTOQUE</Text>
       </TouchableOpacity>
      )}
     </View>
    </ScrollView>
   </ImageBackground>
  );
 }

 const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  header: { backgroundColor: 'white', paddingVertical: 20, marginBottom: 15, elevation: 3},
  title: { fontSize: 24, fontWeight: 'bold', color: 'black', textAlign: 'center' },
  container: {
   marginHorizontal: 10,
   borderRadius: 8,
   backgroundColor: 'rgba(255, 255, 255, 0.85)',
   padding: 10,
   overflow: 'visible',
  },
  inputRow: {
   flexDirection: 'row',
   justifyContent: 'space-around',
   alignItems: 'center',
   marginBottom: 10,
   overflow: 'visible',
   zIndex: 10,
  },
  inputWrapper: {
   flex: 1,
   marginHorizontal: 5,
   overflow: 'visible',
   zIndex: 10,
  },
  label: {
   fontWeight: 'bold',
   color: 'black',
   fontSize: 14,
   marginBottom: 3,
  },
  input: {
   color: 'black',
   fontSize: 14,
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 4,
   paddingVertical: 8,
   paddingHorizontal: 10,
   backgroundColor: 'rgba(245, 245, 245, 0.9)',
  },
  disabledInput: {
   backgroundColor: '#eee',
   color: '#777',
  },
  adjustButton: {
   backgroundColor: '#b8934b',
   paddingVertical: 12,
   paddingHorizontal: 20,
   borderRadius: 30,
   elevation: 5,
   margin: 10,
  },
  adjustButtonText: {
   color: 'white',
   fontWeight: 'bold',
   fontSize: 16,
   textAlign: 'center',
  },
  errorText: {
   color: 'red',
   textAlign: 'center',
   marginTop: 10,
  },
  customDropdownTrigger: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   backgroundColor: 'white',
   borderWidth: 1,
   borderColor: '#ccc',
   borderRadius: 4,
   paddingVertical: 9,
   paddingHorizontal: 10,
   minHeight: 38,
  },
  customDropdownText: {
   color: 'black',
   fontSize: 14,
   flex: 1,
  },
  customDropdownListContainer: {
   position: 'absolute',
   top: 62,
   left: 0,
   right: 0,
   backgroundColor: 'white',
   borderWidth: 1,
   borderColor: '#ccc',
   zIndex: 9999,
   elevation: 20,
   maxHeight: 180,
   borderRadius: 4,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.25,
   shadowRadius: 4,
  },
  customDropdownList: {
   maxHeight: 180,
  },
  customDropdownItem: {
   paddingVertical: 10,
   paddingHorizontal: 12,
   borderBottomWidth: 1,
   borderBottomColor: '#eee',
  },
  customDropdownItemText: {
   color: 'black',
   fontSize: 14,
  },
  // Estilos para o botão "Voltar ao Menu" (CENTRO SUPERIOR ESQUERDO E CORES DO BOTÃO)
  backToMenuButton: {
    position: 'absolute',
    top: 15, // Ajuste conforme a altura do seu header + margem
    left: '5%', // Ajusta para um pouco à esquerda do centro
    backgroundColor: '#b8934b', // Cor do botão principal
    borderRadius: 30, // Borda arredondada como os outros botões
    paddingVertical: 10, // Ajuste o padding vertical
    paddingHorizontal: 15, // Ajuste o padding horizontal
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5, // Sombra como os outros botões
    zIndex: 1,
  },
  backToMenuButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 16,
  },
 });


 