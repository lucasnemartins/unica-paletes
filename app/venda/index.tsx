// ==========================================================================
 // ARQUIVO: frontend/SaleScreen.tsx (QT ESTOQUE ESQUERDA, FORMATO EURO SEM CONVERSÃO - DROPDOWN UNIFICADO PARA IOS E ANDROID)
 // ==========================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ImageBackground } from 'react-native';
 import axios, { AxiosResponse } from 'axios';
 import { useRouter } from 'expo-router';
 import { FontAwesome } from '@expo/vector-icons';
 import { useUser } from '@clerk/clerk-react';
import { API_URL } from '../config';

 interface PalletDetails {
  Cd_Pallet: string;
  Nm_Pallet: string;
  Vl_Unitario: string | null;
  Qt_Estoque: string | null;
 }

 interface ItemVenda {
  Cd_Pallet: string;
  Nm_Pallet?: string;
  Qt_Venda: string;
  Vl_Uni_venda: string;
  Valor_Venda?: string;
  data_venda?: string;
  id_venda?: string;
  usuario?: string;
 }

 export default function SaleScreen() {
  const { user, isLoaded } = useUser();
  const [selectedCdPallet, setSelectedCdPallet] = useState<string | null>(null);
  const [cdPalletInput, setCdPalletInput] = useState('');
  const [qtVendaInput, setQtVendaInput] = useState('');
  const [vlUniVendaInput, setVlUniVendaInput] = useState('');
  const [palletDetails, setPalletDetails] = useState<PalletDetails | null>(null);
  const [itemVenda, setItemVenda] = useState<Omit<ItemVenda, 'Valor_Venda' | 'data_venda'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nomePalletManual, setNomePalletManual] = useState('');
  const [valorVendaCalculado, setValorVendaCalculado] = useState('');
  const [idVenda, setIdVenda] = useState<string | null>(null);
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
     console.log('FRONTEND: GET /api/pallets response:', response.data);
     setAvailablePallets(response.data);
    } catch (err: any) {
     console.error('FRONTEND: Error fetching available pallets:', err);
     setError('Erro ao carregar a lista de pallets.');
    } finally {
     setLoading(false);
    }
   };

   fetchAvailablePallets();
  }, []);

  useEffect(() => {
   if (qtVendaInput && vlUniVendaInput) {
    const valor = (parseFloat(qtVendaInput) * parseFloat(vlUniVendaInput)).toFixed(2);
    setValorVendaCalculado(valor);
   } else {
    setValorVendaCalculado('');
   }
  }, [qtVendaInput, vlUniVendaInput]);

  useEffect(() => {
   if (palletDetails?.Cd_Pallet || selectedCdPallet) {
    setItemVenda({
     Cd_Pallet: palletDetails?.Cd_Pallet || (selectedCdPallet ?? ''),
     Nm_Pallet: palletDetails?.Nm_Pallet || nomePalletManual || 'N/A',
     Qt_Venda: qtVendaInput,
     Vl_Uni_venda: vlUniVendaInput,
    });
    if (selectedCdPallet) {
     setCdPalletInput(selectedCdPallet);
    }
   }
  }, [selectedCdPallet, qtVendaInput, vlUniVendaInput, palletDetails, nomePalletManual]);

  const fetchPalletDetails = async (cdPallet: string) => {
   if (!cdPallet) {
    setPalletDetails(null);
    setNomePalletManual('');
    setError('');
    return;
   }
   setLoading(true);
   setError('');
   try {
    console.log('FRONTEND: Fetching pallet details for:', cdPallet);
    const response: AxiosResponse<PalletDetails> = await axios.get(`${API_URL}/api/estoque-details/${cdPallet}`);
    console.log('FRONTEND: GET /api/estoque-details/${cdPallet} response:', response.data);
    setPalletDetails(response.data);
    setNomePalletManual(response.data.Nm_Pallet);
   } catch (err: any) {
    console.error('FRONTEND: Error fetching pallet details:', err);
    setPalletDetails(null);
    setNomePalletManual('');
    setError('Pallet não encontrado.');
   } finally {
    setLoading(false);
   }
  };

  const handleQtVendaChange = (text: string) => {
   setQtVendaInput(text);
  };

  const handleVlUniVendaChange = (text: string) => {
   setVlUniVendaInput(text.replace(',', '.'));
  };

  const handleNomePalletManualChange = (text: string) => {
   setNomePalletManual(text);
  };

  const handleCdPalletSelect = (itemValue: string) => {
   setSelectedCdPallet(itemValue);
   setCdPalletInput(itemValue);
   setQtVendaInput('');
   setVlUniVendaInput('');
   setValorVendaCalculado('');
   fetchPalletDetails(itemValue);
  };

  const handleCdPalletSelectCustom = (itemValue: string) => {
   setSelectedCdPallet(itemValue);
   setCdPalletInput(itemValue);
   setQtVendaInput('');
   setVlUniVendaInput('');
   setValorVendaCalculado('');
   fetchPalletDetails(itemValue);
   setIsDropdownVisible(false);
  };

  const toggleDropdown = () => {
   setIsDropdownVisible(!isDropdownVisible);
  };

  const handleRegistrarVendaDireta = async () => {
   if (selectedCdPallet && qtVendaInput && vlUniVendaInput) {
    const nomePallet = palletDetails?.Nm_Pallet || nomePalletManual || 'N/A';
    if (palletDetails && palletDetails.Qt_Estoque !== null && parseInt(qtVendaInput) > parseInt(palletDetails.Qt_Estoque)) {
     Alert.alert('Atenção', `Estoque insuficiente para ${nomePallet}. Estoque atual: ${palletDetails.Qt_Estoque}`);
     return;
    }

    const dataVendaObjeto = new Date();
    const ano = dataVendaObjeto.getFullYear();
    const mes = String(dataVendaObjeto.getMonth() + 1).padStart(2, '0');
    const dia = String(dataVendaObjeto.getDate()).padStart(2, '0');
    const horas = String(dataVendaObjeto.getHours()).padStart(2, '0');
    const minutos = String(dataVendaObjeto.getMinutes()).padStart(2, '0');
    const segundos = String(dataVendaObjeto.getSeconds()).padStart(2, '0');
    const dataVendaFormatada = `${ano}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;

    console.log('FRONTEND: Data de venda formatada:', dataVendaFormatada);

    const itemToSend: ItemVenda = {
     id_venda: idVenda || undefined,
     Cd_Pallet: selectedCdPallet,
     Qt_Venda: qtVendaInput,
     Vl_Uni_venda: vlUniVendaInput,
     Nm_Pallet: nomePallet,
     data_venda: dataVendaFormatada,
     Valor_Venda: valorVendaCalculado,
     usuario: [user?.firstName, user?.lastName].filter(Boolean).join(' ')
       || user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
       || user?.emailAddresses?.[0]?.emailAddress
       || user?.id
       || 'Desconhecido',
    };

    console.log('FRONTEND: Attempting to register sale with data:', itemToSend);
    setLoading(true);
    setError('');
    try {
     const response: AxiosResponse<{ message: string; id_venda?: string }> = await axios.post(
      `${API_URL}/api/vendas`,
      [itemToSend],
      {
       headers: {
        'Content-Type': 'application/json',
       },
      }
     );
     console.log('FRONTEND: POST /api/vendas response:', response.data);
     const idVendaRegistada = response.data.id_venda || null;

     setSelectedCdPallet(null);
     setCdPalletInput('');
     setQtVendaInput('');
     setVlUniVendaInput('');
     setPalletDetails(null);
     setNomePalletManual('');
     setValorVendaCalculado('');
     setItemVenda(null);
     setIdVenda(null);
     setError('');

     Alert.alert('Sucesso', response.data.message + (idVendaRegistada ? ` ID: ${idVendaRegistada}` : ''));
    } catch (err: any) {
     console.error('FRONTEND: Erro ao registrar venda:', err);
     setError('Falha ao registrar a venda.');
     if (err.response) {
      console.error('FRONTEND: Erro ao registrar venda - Response data:', err.response.data);
      Alert.alert('Erro', `Falha ao registrar a venda: ${err.response.data.message}`);
     } else {
      Alert.alert('Erro', 'Falha ao registrar a venda.');
     }
    } finally {
     setLoading(false);
    }
   } else {
    Alert.alert('Atenção', 'Por favor, selecione o código do pallet, preencha a quantidade e o valor unitário da venda.');
   }
  };
  

  return (
   <ImageBackground
    source={require('../assets/fundo_sem_logo.png')}
    style={styles.background}
    resizeMode="cover"
   >
    <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.backToStartButton} onPress={goBackToMenu}>
        <FontAwesome name="arrow-left" size={20} color="white" />
        <Text style={styles.backToMenuButtonText}>Menu</Text>
      </TouchableOpacity>
      <Text style={styles.title}>VENDA</Text>
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

     <View style={styles.container}>
      <View style={[styles.inputRow, { zIndex: 100 }]}>
       <View style={[styles.inputWrapper, { zIndex: 100 }]}>
        <Text style={styles.label}>Cd Pallet:</Text>
        <TouchableOpacity style={styles.customDropdownTrigger} onPress={toggleDropdown}>
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
                  setPalletDetails(null);
                  setNomePalletManual('');
                  setIsDropdownVisible(false);
                }}
              >
                <Text style={{ color: '#999' }}>Selecionar...</Text>
              </TouchableOpacity>
              {availablePallets.map((pallet) => (
                <TouchableOpacity
                  key={pallet.Cd_Pallet}
                  style={styles.customDropdownItem}
                  onPress={() => handleCdPalletSelectCustom(pallet.Cd_Pallet)}
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
         value={palletDetails?.Nm_Pallet || ''}
         placeholder="Nome Pallet"
         placeholderTextColor="#999"
         editable={false}
        />
       </View>
      </View>
      <View style={[styles.inputRow, { zIndex: 1 }]}>
       <View style={styles.inputWrapper}>
        <TextInput
         style={styles.input}
         value={qtVendaInput}
         onChangeText={handleQtVendaChange}
         placeholder="Qtd. Venda"
         keyboardType="numeric"
         placeholderTextColor="#999"
        />
       </View>
       <View style={styles.inputWrapper}>
        <TextInput
         style={styles.input}
         value={vlUniVendaInput}
         onChangeText={handleVlUniVendaChange}
         placeholder="€ Valor Unitário Venda"
         keyboardType="decimal-pad"
         placeholderTextColor="#999"
        />
       </View>
      </View>
      <View style={[styles.inputRow, { zIndex: 1 }]}>
        <View style={styles.inputWrapper}>
         <TextInput
          style={[styles.input, styles.disabledInput]}
          value={palletDetails?.Qt_Estoque?.toString() || ''}
          placeholder="Estoque Atual"
          placeholderTextColor="#999"
          editable={false}
         />
        </View>
        <View style={styles.inputWrapper}>
         <TextInput
          style={[styles.input, styles.disabledInput]}
          value={valorVendaCalculado ? `€ ${valorVendaCalculado}` : '€ --,--'}
          placeholder="Valor da Venda"
          placeholderTextColor="#999"
          editable={false}
         />
       </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading && availablePallets.length > 0 && <Text>Carregando detalhes do pallet...</Text>}

      <TouchableOpacity style={styles.registerButton} onPress={handleRegistrarVendaDireta}>
       <Text style={styles.registerButtonText}>REGISTRAR VENDA</Text>
      </TouchableOpacity>

      {idVenda && <Text style={styles.successText}>ID da Venda Registrada: {idVenda}</Text>}
     </View>
    </ScrollView>
   </ImageBackground>
  );
 }
 // Estilos para React Native (SaleScreen.tsx)
 const styles = StyleSheet.create({
    background: { flex: 1, width: '100%', height: '100%' },
    scrollContainer: { flexGrow: 1, paddingBottom: 20 },
    header: { backgroundColor: 'white', paddingVertical: 20, marginBottom: 15, elevation: 3, position: 'relative', alignItems: 'center', paddingLeft: 30 },
    title: { fontSize: 24, fontWeight: 'bold', color: 'black', textAlign: 'center' },
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
    container: {
     marginHorizontal: 10,
     borderRadius: 8,
     backgroundColor: 'rgba(255, 255, 255, 0.85)',
     padding: 10,
     overflow: 'visible',
    },
    inputRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-start',
     marginBottom: 10,
     overflow: 'visible',
    },
    inputWrapper: {
     flex: 1,
     marginHorizontal: 5,
     overflow: 'visible',
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
     backgroundColor: 'white',
     justifyContent: 'center',
     height: 40,
    },
    disabledInput: {
     backgroundColor: '#eee',
     color: '#777',
    },
    registerButton: {
     backgroundColor: '#b8934b',
     paddingVertical: 15,
     borderRadius: 8,
     elevation: 5,
     marginTop: 20,
     alignItems: 'center',
    },
    registerButtonText: {
     color: 'white',
     fontWeight: 'bold',
     fontSize: 18,
    },
    errorText: {
     color: 'red',
     textAlign: 'center',
     marginTop: 10,
    },
    successText: {
     color: 'green',
     textAlign: 'center',
     marginTop: 10,
     fontWeight: 'bold',
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
     fontSize: 14,
     color: 'black',
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
     paddingHorizontal: 10,
     borderBottomWidth: 1,
     borderBottomColor: '#eee',
    },
    customDropdownItemText: {
     color: 'black',
     fontSize: 14,
    },
    // Estilos para o botão "Voltar ao Início"
backToStartButton: {
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
 backToStartButtonText: {
   color: 'white',
   marginLeft: 5,
   fontWeight: 'bold',
   fontSize: 16,
 },

 backToMenuButtonText: {
   color: 'white',
   marginLeft: 5,
   fontWeight: 'bold',
   fontSize: 16,
 },
});

   