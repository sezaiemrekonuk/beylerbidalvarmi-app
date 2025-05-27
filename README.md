# Beyler Bi' Dal? - Üniversitelerarası Sigara Takas Uygulaması

## 🚬 Proje Hakkında

**Beyler Bi' Dal?** üniversite öğrencileri için özel olarak geliştirilmiş, güvenli ve gizlilik odaklı bir sigara takas platformudur. Uygulama, öğrencilerin yalnızca doğrulanmış `.edu.tr` uzantılı üniversite e-posta adresleriyle kayıt olabildiği, reklam tabanlı bir takas sistemi sunar. Bu platform, genel bir pazar yeri değil, üniversite öğrencilerine özel, metin tabanlı bir takas topluluğudur.

Reklamlar, kullanıcının kendi üniversitesindeki diğer öğrencilerin ilanlarına öncelik verecek şekilde sıralanır.

## ✨ Temel Özellikler

-   **Güvenli Erişim ve Kimlik Doğrulama:**
    -   Sadece `.edu.tr` uzantılı üniversite e-postası ile kayıt.
    -   E-posta doğrulaması olmadan özelliklere erişim yok.
    -   Kayıt sırasında Ad Soyad, Telefon Numarası (Türkiye formatında) ve Şifre istenir.
-   **Kullanıcı Profili:**
    -   Profil fotoğrafı yükleme/güncelleme.
    -   Telefon numarası görüntüleme/düzenleme.
    -   Üniversite bilgisi (e-posta alan adından otomatik alınır, düzenlenemez).
    -   Gerçek ad ve soyad kullanılır, takma ad yoktur.
-   **Takas Sistemi:**
    -   **İlan Verme:**
        -   İstenen sigara (marka/model) ve karşılığında teklif edilenler (sadece metin) zorunludur.
        -   İsteğe bağlı ek mesaj eklenebilir.
        -   Kullanıcı başına en fazla 3 aktif ilan sınırı.
        -   İlanlar 7 gün sonra otomatik olarak sona erer.
    -   **İlanları Görüntüleme:**
        -   Önce aynı üniversitedeki, sonra diğer tüm ilanlar (en yeniye göre) sıralanır.
        -   İlan kartlarında kullanıcı adı, üniversitesi, profil fotoğrafı, takas detayları ve ilan zamanı gösterilir.
    -   **İlanlara Yanıt Verme:**
        -   Kullanıcılar özel olarak takas teklifi gönderebilir (tek seferlik mesaj).
    -   **Hareketlerim Sayfası:**
        -   Kullanıcıların kendi ilanlarını ve bu ilanlara gelen yanıtları (yanıt verenin adı, üniversitesi, telefon numarası ve mesajı ile birlikte) görmelerini sağlar.
-   **Raporlama Sistemi:**
    -   Tüm ilanlar ve kullanıcılar raporlanabilir (Spam, Taciz, Yanlış Bilgi, Diğer).

## 🛠️ Kullanılan Teknolojiler

-   **Frontend:** Next.js (App Router), Tailwind CSS v4, Shadcn/ui
-   **Backend & Veritabanı:** Firebase (Authentication, Firestore, Storage)
-   **Dil:** TypeScript

## 🚀 Başlangıç

Bu bölüm, projeyi yerel makinenizde geliştirme ve test amacıyla nasıl kuracağınızı açıklar.

### Gereksinimler

-   Node.js (v18 veya üstü önerilir)
-   npm (Node.js ile birlikte gelir)

### Kurulum

1.  **Projeyi Klonlayın (Eğer bir Git deposu varsa):
    ```bash
    git clone <repository-url>
    cd beylerbidalvarmi-app
    ```
2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```
3.  **Firebase Kurulumu:**
    -   Bir Firebase projesi oluşturun ([https://console.firebase.google.com/](https://console.firebase.google.com/)).
    -   Projenize bir Web uygulaması ekleyin ve Firebase yapılandırma bilgilerinizi (`apiKey`, `authDomain`, vb.) alın.
    -   `src/lib/firebase.ts` dosyasını kendi Firebase proje yapılandırma bilgilerinizle güncelleyin:
        ```typescript
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID",
          measurementId: "YOUR_MEASUREMENT_ID" // İsteğe bağlı
        };
        ```
    -   Firebase konsolunda **Authentication**'ı etkinleştirin ve "E-posta/Şifre" sağlayıcısını açın.
    -   Firebase konsolunda **Firestore Database**'i oluşturun (test modunda başlayıp daha sonra güvenlik kurallarını ayarlayabilirsiniz).
    -   Firebase konsolunda **Storage**'ı etkinleştirin.

4.  **Geliştirme Sunucusunu Çalıştırın:**
    ```bash
    npm run dev
    ```
    Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

### 📚 Önemli Klasörler ve Dosyalar

-   `src/app`: Next.js App Router sayfaları ve layoutları.
    -   `(auth)`: Kimlik doğrulama ile ilgili sayfalar (kayıt, giriş).
    -   `(main)`: Ana uygulama sayfaları (korumalı rotalar).
-   `src/components`: Yeniden kullanılabilir UI bileşenleri.
    -   `ui`: Shadcn/ui tarafından oluşturulan temel bileşenler.
    -   `ads`: İlanlarla ilgili bileşenler (`AdCard`).
    -   `auth`: Kimlik doğrulama ile ilgili bileşenler (`ProtectedRoute`).
-   `src/contexts`: React Context API'leri (örn: `AuthContext`).
-   `src/lib`: Yardımcı fonksiyonlar, Firebase yapılandırması (`firebase.ts`), paylaşılan tipler (`types.ts`).
-   `public`: Statik dosyalar.

## 🛡️ Firestore Güvenlik Kuralları (Örnek)

Projenizin `firestore.rules` dosyasına aşağıdaki gibi kurallar eklemeyi unutmayın:

```firestore-rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Kullanıcılar kendi profil bilgilerini okuyabilir ve güncelleyebilir.
    // Sadece doğrulanmış e-postaya sahip kullanıcılar kendi bilgilerini yazabilir.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId && request.auth.token.email_verified == true;
    }

    // İlanlar
    // Sadece doğrulanmış e-postaya sahip kullanıcılar ilanları okuyabilir.
    // Kullanıcılar sadece kendi ilanlarını oluşturabilir, güncelleyebilir (henüz yok) veya silebilir (henüz yok).
    // İlan oluşturmak için e-postanın doğrulanmış olması gerekir.
    match /ads/{adId} {
      allow read: if request.auth != null && request.auth.token.email_verified == true;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId && request.auth.token.email_verified == true;
      // allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId && request.auth.token.email_verified == true;
    }

    // Yanıtlar
    // Sadece doğrulanmış e-postaya sahip kullanıcılar yanıtları okuyabilir (kısıtlı).
    // Sadece doğrulanmış e-postaya sahip kullanıcılar yanıt oluşturabilir.
    match /responses/{responseId} {
      // İlan sahibi ve yanıtı gönderen kişi okuyabilir.
      allow read: if request.auth != null && request.auth.token.email_verified == true && 
                    (request.auth.uid == resource.data.responderId || exists(/databases/$(database)/documents/ads/$(resource.data.adId)) && get(/databases/$(database)/documents/ads/$(resource.data.adId)).data.userId == request.auth.uid);
      allow create: if request.auth != null && request.auth.uid == request.resource.data.responderId && request.auth.token.email_verified == true;
    }

    // Raporlar
    // Sadece doğrulanmış e-postaya sahip kullanıcılar rapor oluşturabilir.
    // Raporlar sadece backend/admin tarafından okunabilir (güvenlik kuralı burada belirtilmedi, admin paneli için düşünülmeli).
    match /reports/{reportId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.reporterId && request.auth.token.email_verified == true;
      allow read: if false; // Adminler için backend üzerinden erişim düşünülmeli
    }
  }
}
```

**Not:** Bu güvenlik kuralları bir başlangıç noktasıdır ve uygulamanızın özel ihtiyaçlarına göre daha da geliştirilmelidir.

## 🤝 Katkıda Bulunma

Katkılarınız projeyi daha da geliştirmemize yardımcı olur. Lütfen bir pull request açmadan önce bir issue oluşturarak yapmak istediğiniz değişiklikleri tartışın.

## ✨ Gelecekteki İyileştirmeler (Nice to Have)

-   **Anlık Bildirimler:** Yeni yanıtlar veya önemli güncellemeler için Firebase Cloud Messaging (FCM) entegrasyonu.
-   **Gelişmiş Filtreleme ve Sıralama:** İlanlar için (örn: istenen sigaraya, üniversiteye veya popülerliğe göre).
-   **Kullanıcı Değerlendirme Sistemi:** Takas sonrası kullanıcıların birbirini puanlayabileceği bir sistem.
-   **Admin Paneli:** Kullanıcıları, ilanları ve raporları yönetmek için basit bir arayüz.
-   **İlan Düzenleme/Silme:** Kullanıcıların kendi aktif ilanlarını düzenleyebilmesi veya silebilmesi.
-   **Sohbet Özelliği:** Yanıtlar üzerinden daha dinamik bir iletişim için basit bir sohbet modülü.
-   **Şifre Sıfırlama:** "Şifremi Unuttum" fonksiyonu.
-   **Karanlık Mod:** Kullanıcı arayüzü için bir karanlık tema seçeneği.

---

Bu README dosyası uygulamanız için iyi bir başlangıç noktasıdır. İhtiyaçlarınıza göre daha fazla detay ekleyebilirsiniz.
