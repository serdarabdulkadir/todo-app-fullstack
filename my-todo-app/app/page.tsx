import TodoList from "./components/TodoList";

// Normalde bu veri veritabanından (Prisma vb.) gelir.
// Şimdilik test için elle yazılmış bir liste (Mock Data) kullanıyoruz.
const dummyTodos = [
  { id: 1, title: "Next.js Öğren", completed: false },
  { id: 2, title: "Optimistic UI Kur", completed: false },
  { id: 3, title: "Markete Git", completed: true },
];

export default async function Home() {
  // Burası Server Component olduğu için async olabilir ve veritabanına bağlanabilir.
  // const todos = await prisma.todo.findMany(); // Gerçek senaryo böyle olurdu.
  const todos = dummyTodos; 

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center pt-20">
      <div className="w-full max-w-md px-4">
        <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Yapılacaklar Listesi
        </h1>
        
        {/* Client Component'e veriyi buradan gönderiyoruz */}
        <TodoList todos={todos} />
        
        <p className="mt-8 text-sm text-gray-500 text-center">
          Not: Checkbox'a bastığında anında değişir (Optimistic).<br/>
          Server (konsol) logları ise 1 saniye sonra düşer.
        </p>
      </div>
    </main>
  );
}