'use server';

import { revalidatePath } from "next/cache";
// import prisma from "@/lib/db"; // Eğer Prisma kullanıyorsan bunu aç

export async function toggleTodo(id: string, currentStatus: boolean) {
  try {
    // 1. Yapay gecikme (Optimistic farkını görmek için, sonra silebilirsin)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Veritabanı Güncellemesi
    // Prisma kullanıyorsan kodun şöyle olacak:
    /*
    await prisma.todo.update({
      where: { id },
      data: { completed: !currentStatus },
    });
    */
    
    // Şimdilik sadece log basıyoruz:
    console.log(`SERVER: Todo ${id} durumu ${!currentStatus} oldu.`);

    // 3. Sayfayı yenile ki güncel veri gelsin
    revalidatePath("/");
    
  } catch (error) {
    console.error("Hata oluştu:", error);
    // Hata durumunda bir şey döndürebilirsin
  }
}