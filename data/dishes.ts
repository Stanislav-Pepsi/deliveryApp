import { DishData } from '../App';

export const DISHES: DishData[] = [
  {
    id: '1',
    name: 'Сет «Базилик»',
    weight: '2 135 г',
    desc: '8 шт. Филадельфия, 8 шт. Темпура, 8 шт. Запечённый лосось',
    price: '11 390 ₸',
    img: require('../assets/pexels-imudruk-11363275.jpg'),
    category: 'СЕТЫ',
    calories: 1840, protein: 96, fat: 72, carbs: 180, time: '25 мин',
  },
  {
    id: '2',
    name: 'Сет «Шеф»',
    weight: '3 725 г',
    desc: '8 шт. Цезарь, 8 шт. Банзай, 6 шт. Маки с лососем',
    price: '19 390 ₸',
    img: require('../assets/pexels-zisan-ozdemir-53442109-27530549.jpg'),
    category: 'СЕТЫ',
    calories: 3200, protein: 168, fat: 124, carbs: 310, time: '30 мин',
  },
  {
    id: '3',
    name: 'Боул «Лосось»',
    weight: '450 г',
    desc: 'Лосось сашими, бурый рис, авокадо, эдамаме. Подаётся с тёплым фокаччо и оливковым маслом первого отжима.',
    price: '3 490 ₸',
    img: require('../assets/pexels-damla-selen-demir-429137893-33158369.jpg'),
    category: 'БОУЛЫ',
    calories: 420, protein: 32, fat: 18, carbs: 38, time: '22 мин',
  },
  {
    id: '4',
    name: 'Паста карбонара',
    weight: '380 г',
    desc: 'Паста феттучини, бекон, яйцо, пармезан, чёрный перец. Классический итальянский рецепт.',
    price: '2 890 ₸',
    img: require('../assets/pexels-gu-ko-2150570603-37297733.jpg'),
    category: 'ПАСТА',
    calories: 680, protein: 28, fat: 34, carbs: 62, time: '18 мин',
  },
];

export const CATEGORIES = [
  { id: 'all',    label: 'Всё меню' },
  { id: 'СЕТЫ',  label: 'Сеты' },
  { id: 'БОУЛЫ', label: 'Боулы' },
  { id: 'ПАСТА', label: 'Паста' },
];
