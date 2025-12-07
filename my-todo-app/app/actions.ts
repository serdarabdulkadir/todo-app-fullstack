'use server';

import { revalidatePath } from "next/cache";

// Bu fonksiyon, checkbox'a tıklandığında sunucuda çalışacak
export async function toggleTodo(id: number, currentStatus: boolean) {
  
  // 1. Yapay Gecikme: Sanki veritabanın yavaşmış gibi 1 saniye bekletiyoruz.
  // Bu süre içinde arayüz çoktan güncellenmiş olacak (Optimistic UI sayesinde).
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 2. Normalde burada veritabanı güncelleme kodun olur.
  // Örn: db.todo.update(...) 
  console.log(`SERVER: Todo ID ${id} durumu ${!currentStatus} olarak güncellendi.`);

  // 3. Next.js'e verinin değiştiğini ve sayfayı yenilemesi gerektiğini söylüyoruz.
  revalidatePath("/");
}