'use client';

import { useOptimistic, startTransition } from 'react';
import { toggleTodo } from '../actions'; // Bir üst klasördeki actions dosyasından alıyoruz

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

export default function TodoList({ todos }: { todos: Todo[] }) {
  
  // --- OPTIMISTIC UI AYARI ---
  // useOptimistic: Görünen listeyi anında manipüle etmemizi sağlar.
  const [optimisticTodos, setOptimisticTodo] = useOptimistic(
    todos,
    (state, todoId: number) => {
      // Tıklanan todo'yu bul ve completed değerini tersine çevir
      return state.map((t) =>
        t.id === todoId ? { ...t, completed: !t.completed } : t
      );
    }
  );

  const handleToggle = async (todo: Todo) => {
    // 1. ARAYÜZÜ GÜNCELLE (Hemen!)
    startTransition(() => {
      setOptimisticTodo(todo.id); 
    });

    // 2. SUNUCUYA HABER VER (Arka planda)
    await toggleTodo(todo.id, todo.completed);
  };

  return (
    <ul className="flex flex-col gap-3">
      {optimisticTodos.map((todo) => (
        <li
          key={todo.id}
          className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300
            ${todo.completed 
              ? 'bg-green-900/20 border-green-800' 
              : 'bg-gray-800 border-gray-700'}
          `}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={todo.completed}
              // Dikkat: Burada onClick veya onChange içinde startTransition kullanıyoruz
              onChange={() => handleToggle(todo)}
              className="w-5 h-5 cursor-pointer accent-green-500 rounded focus:ring-green-500"
            />
            <span 
              className={`text-lg ${todo.completed ? 'line-through text-gray-500' : 'text-gray-100'}`}
            >
              {todo.title}
            </span>
          </div>
          
          {/* Debug için küçük bir bilgi (İstersen silebilirsin) */}
          <span className="text-xs text-gray-600">
            {todo.completed ? 'Tamamlandı' : 'Bekliyor'}
          </span>
        </li>
      ))}
    </ul>
  );
}