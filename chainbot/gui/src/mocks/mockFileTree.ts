export const mockFileTree = [
  {
    id: 'root',
    name: 'alexos',
    type: 'folder',
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        children: [
          { id: 'app', name: 'App.tsx', type: 'file' },
          { id: 'index', name: 'index.css', type: 'file' },
        ],
      },
      {
        id: 'public',
        name: 'public',
        type: 'folder',
        children: [
          { id: 'favicon', name: 'favicon.ico', type: 'file' },
        ],
      },
    ],
  },
]; 