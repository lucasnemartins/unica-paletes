import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import axios, { AxiosResponse } from 'axios';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
// ... existing code ... 