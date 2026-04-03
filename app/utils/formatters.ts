import moment from 'moment';

// Função para formatar moeda
const formatCurrency = (value: number | string): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(numericValue)
    ? `€ ${numericValue.toFixed(2).replace('.', ',')}`
    : '€ 0,00';
};

// Função para formatar data
const formatDate = (date: Date | string): string => {
  const momentDate = moment(date);
  return momentDate.isValid() ? momentDate.format('DD/MM/YYYY') : '';
};

// Função para formatar números
const formatNumber = (value: number | string): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
};

const formatters = {
  formatCurrency,
  formatDate,
  formatNumber,
};

export default formatters; 