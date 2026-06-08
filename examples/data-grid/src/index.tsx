import { DataGrid } from '@termuijs/widgets';

const columns = [
  { key: 'name', header: 'Name', width: 15, sortable: true },
  { key: 'age', header: 'Age', width: 8, sortable: true },
  { key: 'city', header: 'City', width: 15, sortable: true },
];

const rows = [
  { name: 'Alice', age: 30, city: 'Delhi' },
  { name: 'Bob', age: 25, city: 'Mumbai' },
  { name: 'Carol', age: 35, city: 'Bangalore' },
  { name: 'Dave', age: 28, city: 'Chennai' },
];

const grid = new DataGrid({ columns, rows });
console.log('DataGrid example running. Use arrow keys to navigate.');
