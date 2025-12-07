'use client';

import { useOptimistic, startTransition } from 'react';
import { toggleTodo } from '@/app/actions'; // Action'ı import et

// Senin Todo tipin muhtemelen böyledir, değilse kendi tipine göre düzenle
type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

export default function TodoList({ todos }: { todos: Todo[] }) {
  
  // --- OPTIMISTIC AYARI ---
  const [optimisticTodos, setOptimisticTodo] = useOptimistic(
    todos,
    (state, todoId: string) => {
      // Tıklanan todo'yu bul ve 'completed' değerini tersine çevir
      return state.map((t) =>
        t.id === todoId ? { ...t, completed: !t.completed } : t
      );
    }
  );

  const handleToggle = async (todo: Todo) => {
    // 1. GÖRÜNÜMÜ GÜNCELLE (ANINDA)
    startTransition(() => {
      setOptimisticTodo(todo.id);
    });

    // 2. SUNUCUYA İSTEK AT (ARKADAN)
    await toggleTodo(todo.id, todo.completed);
  };

  return (
    <ul className="flex flex-col gap-3 w-full">
      {optimisticTodos.map((todo) => (
        <li
          key={todo.id}
          className={`flex items-center justify-between p-4 bg-gray-800 rounded-xl border transition-all duration-300
            ${todo.completed 
              ? 'border-green-500/50 bg-green-900/10' // Tamamlandıysa yeşilimsi
              : 'border-gray-700 hover:border-gray-600'} 
          `}
        >
          <div className="flex items-center gap-4">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo)} // Tıklama olayı
              className="w-6 h-6 rounded-md border-gray-600 text-green-500 focus:ring-green-500/50 bg-gray-700 cursor-pointer transition-all"
            />
            
            {/* Yazı */}
            <span 
              className={`text-lg font-medium transition-all ${
                todo.completed 
                  ? 'line-through text-gray-500' 
                  : 'text-gray-100'
              }`}
            >
              {todo.title}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}