import { useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ImageBackground, Text } from 'react-native';
import { useAuth } from '@clerk/clerk-react';

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const irParaCompra = () => {
    router.push('/compra');
  };

  const irParaVenda = () => {
    router.push('/venda');
  };

  const irParaInventario = () => {
    router.push('/inventario');
  };

  const irParaFluxoDeCaixa = () => {
    router.push('/fluxo-de-caixa');
  };

  const irParaPalete = () => {
    router.push('/palete');
  };
  

  return (
    <ImageBackground
      source={require('./assets/fundo_com_logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={irParaCompra}>
              <Text style={styles.buttonText}>COMPRAR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={irParaVenda}>
              <Text style={styles.buttonText}>VENDER</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={irParaInventario}>
              <Text style={styles.buttonText}>INVENTÁRIO</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={irParaFluxoDeCaixa}>
              <Text style={styles.buttonText}>CAIXA</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.paleteButton]} onPress={irParaPalete}>
              <Text style={styles.buttonText}>PALETES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
 }

 const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 10,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    width: '90%',
    justifyContent: 'space-around',
    marginBottom: 10, // Aumentei um pouco o marginBottom entre as linhas
  },
  button: {
    backgroundColor: '#b8934b',
    paddingHorizontal: 25, // Ajustei o padding horizontal
    borderRadius: 10, // Arredondamento um pouco maior
    elevation: 5, // Sombra um pouco maior
    width: 170,
    alignItems: 'center',
    justifyContent: 'center',
    height:80,
    marginRight: 10,
    right:17,
    marginTop: 0
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  paleteButton: {
    marginLeft: 60,
  },
  logoutButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 10,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
 });