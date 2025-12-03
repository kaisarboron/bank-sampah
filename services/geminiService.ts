import { GoogleGenAI } from "@google/genai";
import { Transaction, WasteType } from "../types";

const apiKey = process.env.API_KEY;

export const GeminiService = {
  generateReport: async (transactions: Transaction[], wasteTypes: WasteType[]): Promise<string> => {
    if (!apiKey) {
      return "Error: API Key is missing. Please check your environment configuration.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare data summary for context
      const summaryData = {
        totalTransactions: transactions.length,
        totalWeight: transactions.reduce((acc, curr) => acc + curr.weight, 0),
        totalValuePaid: transactions.reduce((acc, curr) => acc + curr.totalAmount, 0),
        wasteTypesAvailable: wasteTypes.map(w => w.name),
        recentTransactions: transactions.slice(-10), // Send last 10 for detail
      };

      const prompt = `
        Bertindaklah sebagai Analis Lingkungan dan Keuangan untuk Bank Sampah "Nabung Bersih".
        
        Berikut adalah data ringkasan operasional kami dalam format JSON:
        ${JSON.stringify(summaryData, null, 2)}
        
        Tolong buatkan laporan singkat dan menarik (gunakan Markdown) yang mencakup:
        1. **Ringkasan Kinerja**: Analisis total sampah terkumpul dan uang yang disalurkan ke nasabah.
        2. **Tren Sampah**: Jenis sampah apa yang tampaknya paling sering ditransaksikan (berdasarkan data 10 transaksi terakhir).
        3. **Dampak Lingkungan**: Estimasi dampak positif (misal: penghematan CO2 atau energi) berdasarkan berat sampah secara umum. Gunakan estimasi umum.
        4. **Rekomendasi**: Saran untuk admin bank sampah untuk meningkatkan partisipasi nasabah.
        
        Gunakan bahasa Indonesia yang formal namun memotivasi.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "Gagal menghasilkan laporan.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Maaf, terjadi kesalahan saat menghubungkan ke layanan AI untuk pembuatan laporan.";
    }
  },

  generateUserReport: async (transactions: Transaction[], userName: string): Promise<string> => {
    if (!apiKey) {
      return "Error: API Key is missing. Please check your environment configuration.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Prepare user specific summary
      const totalWeight = transactions.reduce((acc, curr) => acc + curr.weight, 0);
      const totalEarnings = transactions.reduce((acc, curr) => acc + curr.totalAmount, 0);
      
      // Calculate waste composition
      const composition = transactions.reduce((acc, curr) => {
        acc[curr.wasteName] = (acc[curr.wasteName] || 0) + curr.weight;
        return acc;
      }, {} as Record<string, number>);

      const summaryData = {
        userName,
        totalTransactions: transactions.length,
        totalWeight,
        totalEarnings,
        wasteComposition: composition,
      };

      const prompt = `
        Bertindaklah sebagai Asisten Lingkungan Pribadi untuk nasabah bernama ${userName} di Bank Sampah "Nabung Bersih".
        
        Berikut adalah data aktivitas daur ulang nasabah ini:
        ${JSON.stringify(summaryData, null, 2)}
        
        Buatkan laporan personal yang hangat dan memotivasi (Markdown) mencakup:
        1. **Pencapaian Anda**: Rayakan total berat sampah (${totalWeight} kg) dan pendapatan yang mereka hasilkan. Berikan analogi sederhana (misal: "Anda telah menyelamatkan setara dengan X pohon").
        2. **Analisis Kebiasaan**: Komentari jenis sampah yang paling sering mereka setor.
        3. **Tips Hemat & Lingkungan**: Berikan 2 tips praktis untuk meningkatkan nilai tabungan sampah mereka atau cara memilah sampah yang lebih baik berdasarkan data komposisi mereka.
        4. **Kalimat Penutup**: Motivasi untuk terus menabung sampah.
        
        Gunakan gaya bahasa yang bersahabat, menyemangati, dan edukatif.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "Gagal menghasilkan laporan personal.";

    } catch (error) {
      console.error("Gemini Error:", error);
      return "Maaf, terjadi kesalahan saat menghubungkan ke layanan AI.";
    }
  }
};