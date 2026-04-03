import { NavigationProp, RouteProp } from '@react-navigation/native';
 import { StackScreenProps } from '@react-navigation/stack';

 export type RootStackParamList = {
  Compra: undefined;
  Venda: undefined;
  Inventario: undefined;
  FluxoCaixa: undefined;
  HomeScreen: undefined;
  // Adicione outras telas e seus respectivos parâmetros (se houver)
 };

 export type HomeScreenNavigationProp = NavigationProp<RootStackParamList, 'HomeScreen'>;
 export type HomeScreenRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;

 export type HomeScreenProps = StackScreenProps<RootStackParamList, 'HomeScreen'>;

 // Exporte também outras interfaces ou tipos que você possa ter definido
 // export interface OutroTipo { ... }