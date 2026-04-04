// ==========================================================================
// ARQUIVO: app/fluxo-de-caixa/index.tsx (CÓDIGO COMPLETO E CORRIGIDO)
// ==========================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { API_URL } from '../config';

interface CashFlowData {
  Data_Caixa: string;
  Compra: string;
  Caixa_Atual: string | null;
  Saldo: string | null;
}

export default function FluxoCaixaScreen() {
  const router = useRouter();
  const [compraInput, setCompraInput] = useState('');
  const [cashFlowHistory, setCashFlowHistory] = useState<CashFlowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCompras, setTotalCompras] = useState(0);
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [totalCaixa, setTotalCaixa] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);

  // Array com os últimos 30 dias para seleção
  const last30Days = Array.from({length: 30}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowDateModal(false);
    fetchCashFlowData(date);
  };

  const fetchCashFlowData = async (dateStr?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = dateStr 
        ? `${API_URL}/api/fluxo-caixa?data=${dateStr}`
        : `${API_URL}/api/fluxo-caixa`;
      
      const response = await axios.get(url);
      setCashFlowHistory(response.data);

      // Buscar total de compras e usar o último Caixa_Atual do histórico como saldo atual
      const resumoResponse = await axios.get(`${API_URL}/api/resumo-caixa`);
      setTotalCompras(resumoResponse.data.totalCompras || 0);
      setSaldoAtual(resumoResponse.data.saldoAtual || 0);
      setTotalCaixa(resumoResponse.data.totalCaixa || 0);

    } catch (err) {
      setError('Erro ao carregar histórico');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData();
  }, []);

  const handleAdicionarCompra = async () => {
    if (!compraInput) {
      setError('Por favor, insira um valor');
      return;
    }

    const valor = parseFloat(compraInput);
    if (isNaN(valor) || valor <= 0) {
      setError('Por favor, insira um valor válido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Enviando dados:', { valor, caixaAtual: saldoAtual });
      
      const response = await axios.post(`${API_URL}/api/registrar-compra`, {
        valor: valor,
        caixaAtual: saldoAtual
      });

      console.log('Resposta:', response.data);
      setCompraInput('');
      fetchCashFlowData(selectedDate);
    } catch (err) {
      console.error('Erro ao adicionar compra:', err);
      setError('Erro ao adicionar compra');
    } finally {
      setLoading(false);
    }
  };

  const handleFecharCaixa = () => {
    setShowFechamentoModal(true);
  };

  const confirmarFechamento = () => {
    setShowFechamentoModal(false);
    window.alert(`✓ Caixa do dia fechado!\n\nTotal adicionado hoje: € ${totalCaixa.toFixed(2)}\nTotal de compras: € ${totalCompras.toFixed(2)}\nSaldo atual: € ${saldoAtual.toFixed(2)}`);
  };

  const goBackToMenu = () => {
    router.back();
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <ImageBackground
      source={require('../assets/fundo_sem_logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backToMenuButton}
          onPress={goBackToMenu}
        >
          <Feather name="arrow-left" size={20} color="white" />
          <Text style={styles.backToMenuButtonText}>Menu</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>CAIXA</Text>
        </View>

        <View style={styles.container}>
          <TextInput
            style={styles.input}
            value={compraInput}
            onChangeText={setCompraInput}
            placeholder="Adicionar caixa"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <View style={styles.botoesRow}>
            <TouchableOpacity style={[styles.addButton, { flex: 1, marginRight: 6 }]} onPress={handleAdicionarCompra} disabled={loading}>
              <Feather name="plus-circle" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.addButtonText}>ADICIONAR CAIXA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fecharButton, { flex: 1, marginLeft: 6 }]} onPress={handleFecharCaixa} disabled={loading}>
              <Feather name="lock" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.addButtonText}>FECHAR CAIXA</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.summaryInput, styles.disabledInput]}
            value={`Total de Compras: € ${isNaN(totalCompras) ? '0.00' : totalCompras.toFixed(2)}`}
            editable={false}
          />
          <TextInput
            style={[styles.summaryInput, styles.disabledInput]}
            value={`Saldo Atual: € ${isNaN(saldoAtual) ? '0.00' : saldoAtual.toFixed(2)}`}
            editable={false}
          />
          <TextInput
            style={[styles.summaryInput, styles.disabledInput, styles.destaqueInput]}
            value={`Total Adicionado Hoje: € ${isNaN(totalCaixa) ? '0.00' : totalCaixa.toFixed(2)}`}
            editable={false}
          />

          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDateModal(true)}
            >
              <Text style={styles.dateButtonText}>
                {selectedDate ? `Data: ${formatDate(selectedDate)}` : 'Selecionar Data'}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showDateModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDateModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione uma Data</Text>
                <ScrollView style={styles.dateList}>
                  {last30Days.map((date) => (
                    <TouchableOpacity
                      key={date}
                      style={[
                        styles.dateItem,
                        selectedDate === date && styles.selectedDateItem
                      ]}
                      onPress={() => handleDateSelect(date)}
                    >
                      <Text style={[
                        styles.dateItemText,
                        selectedDate === date && styles.selectedDateText
                      ]}>
                        {formatDate(date)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDateModal(false)}
                >
                  <Text style={styles.closeButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {selectedDate && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>
                Histórico do dia {formatDate(selectedDate)}
              </Text>
              {loading ? (
                <ActivityIndicator size="large" color="#b8934b" />
              ) : (
                cashFlowHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyItemText}>Data: {new Date(item.Data_Caixa).toLocaleDateString()}</Text>
                    <Text style={styles.historyItemText}>Compra: € {parseFloat(item.Compra || '0').toFixed(2)}</Text>
                    <Text style={styles.historyItemText}>Caixa Atual: € {item.Caixa_Atual !== null ? parseFloat(item.Caixa_Atual).toFixed(2) : 'N/A'}</Text>
                    <Text style={styles.historyItemText}>Saldo: € {item.Saldo !== null ? parseFloat(item.Saldo).toFixed(2) : 'N/A'}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Fechar Caixa do Dia */}
      <Modal visible={showFechamentoModal} transparent animationType="fade" onRequestClose={() => setShowFechamentoModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.fechamentoModal}>
            <Feather name="lock" size={32} color="#b8934b" style={{ marginBottom: 12 }} />
            <Text style={styles.fechamentoTitulo}>Fechar Caixa do Dia</Text>
            <View style={styles.fechamentoLinha}>
              <Text style={styles.fechamentoLabel}>Total Adicionado Hoje</Text>
              <Text style={styles.fechamentoValor}>€ {totalCaixa.toFixed(2)}</Text>
            </View>
            <View style={styles.fechamentoLinha}>
              <Text style={styles.fechamentoLabel}>Total de Compras</Text>
              <Text style={styles.fechamentoValor}>€ {totalCompras.toFixed(2)}</Text>
            </View>
            <View style={[styles.fechamentoLinha, styles.fechamentoSaldo]}>
              <Text style={[styles.fechamentoLabel, { fontWeight: 'bold' }]}>Saldo Atual</Text>
              <Text style={[styles.fechamentoValor, { fontWeight: 'bold', color: saldoAtual >= 0 ? '#27ae60' : '#c0392b' }]}>
                € {saldoAtual.toFixed(2)}
              </Text>
            </View>
            <View style={styles.fechamentoBotoes}>
              <TouchableOpacity style={styles.fechamentoCancelar} onPress={() => setShowFechamentoModal(false)}>
                <Text style={styles.fechamentoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fechamentoConfirmar} onPress={confirmarFechamento}>
                <Text style={styles.fechamentoConfirmarTexto}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { 
    flex: 1, 
    width: '100%', 
    height: '100%' 
  },
  scrollContainer: { 
    flexGrow: 1, 
    paddingBottom: 20 
  },
  header: { 
    backgroundColor: 'white', 
    paddingVertical: 20, 
    marginBottom: 15, 
    elevation: 3 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'black', 
    textAlign: 'center' 
  },
  container: {
    marginHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 15,
  },
  input: {
    color: 'black',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    marginBottom: 8,
    height: 45,
  },
  botoesRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#b8934b',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 3,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fecharButton: {
    backgroundColor: '#5d4e37',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 3,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  destaqueInput: {
    borderColor: '#b8934b',
    borderWidth: 2,
    color: '#5d4e37',
    fontWeight: 'bold',
  },
  fechamentoModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '88%',
    alignItems: 'center',
  },
  fechamentoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  fechamentoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fechamentoSaldo: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  fechamentoLabel: {
    fontSize: 15,
    color: '#555',
  },
  fechamentoValor: {
    fontSize: 15,
    color: '#333',
  },
  fechamentoBotoes: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  fechamentoCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  fechamentoCancelarTexto: {
    color: '#666',
    fontWeight: 'bold',
  },
  fechamentoConfirmar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#b8934b',
    alignItems: 'center',
  },
  fechamentoConfirmarTexto: {
    color: 'white',
    fontWeight: 'bold',
  },
  historyContainer: {
    marginTop: 20,
    padding: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyItemText: {
    fontSize: 14,
    color: 'black',
    marginBottom: 3,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  summaryInput: {
    color: 'black',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    marginBottom: 5,
  },
  disabledInput: {
    backgroundColor: '#eee',
    color: '#777',
  },
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
  filterContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: '#b8934b',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  dateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  dateList: {
    maxHeight: 400,
  },
  dateItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedDateItem: {
    backgroundColor: '#b8934b',
  },
  dateItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDateText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#b8934b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});