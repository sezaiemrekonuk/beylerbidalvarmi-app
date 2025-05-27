# Proje Özellikleri ve Teknik Detaylar: Beyler Bi' Dal?

Bu doküman, "Beyler Bi' Dal?" uygulamasının temel özelliklerini, teknik yapısını ve Firestore veritabanı şemasını özetlemektedir.

## 1. Genel Bakış

-   **Amaç:** Üniversite öğrencileri arasında güvenli ve doğrulanmış bir sigara takas platformu oluşturmak.
-   **Hedef Kitle:** Türkiye'deki üniversite öğrencileri.
-   **Ana Platform:** Web uygulaması (Next.js).
-   **Dil:** Türkçe.

## 2. Teknoloji Stack'i

-   **Frontend:**
    -   Next.js (v13+ App Router ile)
    -   React
    -   TypeScript
    -   Tailwind CSS (v4)
    -   Shadcn/ui (Avatar, Card, Dialog, Form, Button, Input, Label, Textarea, Select bileşenleri)
-   **Backend & Veritabanı:**
    -   Firebase Authentication (E-posta/Şifre ile, `.edu.tr` e-posta doğrulaması)
    -   Firestore (NoSQL Veritabanı)
    -   Firebase Storage (Profil fotoğrafları için)
-   **Ek Kütüphaneler:**
    -   `react-firebase-hooks` (Firebase entegrasyonu için)
    -   `lucide-react` (İkonlar için)

## 3. Temel Fonksiyonlar ve Akışlar

### 3.1. Kullanıcı Yönetimi

-   **Kayıt Ol (`/signup`):
    -   **Girdiler:** Ad Soyad, E-posta (sadece `.edu.tr`), Telefon Numarası (TR formatı), Şifre.
    -   **Doğrulama:**
        -   Tüm alanlar zorunlu.
        -   E-posta formatı `.edu.tr` olmalı.
        -   Telefon numarası Türkiye formatında olmalı.
    -   **İşlem:**
        1.  Firebase Auth ile kullanıcı oluşturur (`createUserWithEmailAndPassword`).
        2.  Kullanıcıya doğrulama e-postası gönderir (`sendEmailVerification`).
        3.  Firestore `/users` koleksiyonuna kullanıcı bilgilerini kaydeder (UID anahtar olarak):
            -   `name`
            -   `email`
            -   `phone`
            -   `universityDomain` (e-postadan parse edilir)
            -   `profilePhotoUrl` (başlangıçta boş)
            -   `createdAt` (Timestamp)
    -   **Sonuç:** Başarı mesajı gösterilir, kullanıcı giriş sayfasına yönlendirilir.
-   **Giriş Yap (`/login`):
    -   **Girdiler:** E-posta, Şifre.
    -   **İşlem:**
        1.  Firebase Auth ile giriş yapar (`signInWithEmailAndPassword`).
        2.  E-posta doğrulaması kontrol edilir.
    -   **Sonuç:**
        -   Başarılı ve e-posta doğrulanmışsa: Ana sayfaya (`/`) yönlendirilir.
        -   E-posta doğrulanmamışsa: Uyarı gösterilir, ana sayfaya yönlendirilmez.
        -   Hatalı giriş: Hata mesajı gösterilir.
-   **Oturumu Kapatma:**
    -   Firebase Auth `signOut` kullanılır.
    -   Kullanıcı giriş sayfasına yönlendirilir.
-   **AuthContext (`AuthContext.tsx`):
    -   Firebase Auth durumunu (`user`, `loading`) ve Firestore kullanıcı detaylarını (`appUser`) yönetir.
    -   `useAuth` hook'u ile erişilir.
    -   `refreshAppUser` fonksiyonu ile Firestore kullanıcı verilerini manuel günceller.
-   **Korumalı Rotalar (`ProtectedRoute.tsx`):
    -   Giriş yapmamış veya e-postası doğrulanmamış kullanıcıları `/login` sayfasına yönlendirir.
    -   `/ (main)` layout'unda kullanılır.

### 3.2. Profil Yönetimi (`/profile`)

-   **Görüntülenen Bilgiler:**
    -   E-posta (düzenlenemez).
    -   Üniversite (e-postadan, düzenlenemez).
-   **Düzenlenebilir Bilgiler:**
    -   Ad Soyad.
    -   Telefon Numarası.
    -   Profil Fotoğrafı.
-   **İşlemler:**
    -   **Bilgi Güncelleme:**
        1.  Firestore `/users/{userId}` dokümanı güncellenir.
        2.  Firebase Auth kullanıcı profili güncellenir (`updateProfile`).
        3.  `AuthContext`'teki `appUser` güncellenir (`refreshAppUser`).
    -   **Profil Fotoğrafı Yükleme/Değiştirme:**
        1.  Fotoğraf Firebase Storage'a yüklenir (`/profile_photos/{userId}/{timestamp}_{fileName}`).
        2.  Alınan indirme URL'si Firestore `/users/{userId}` dokümanındaki `profilePhotoUrl` alanına kaydedilir.
        3.  `AuthContext` güncellenir.

### 3.3. İlan Yönetimi

-   **İlan Oluşturma (`/ads/create`):
    -   **Girdiler:** İstenen Sigara (zorunlu), Teklif Edilenler (zorunlu), Mesaj (isteğe bağlı).
    -   **Kontroller:** Kullanıcının aktif ilan sayısı maksimum 3 olabilir.
    -   **İşlem:** Firestore `/ads` koleksiyonuna yeni ilan eklenir:
        -   `userId` (ilanı verenin UID'si)
        -   `universityDomain` (ilanı verenin üniversitesi)
        -   `requested` (string)
        -   `offered` (string)
        -   `message` (string, isteğe bağlı)
        -   `createdAt` (Timestamp, o anki zaman)
        -   `expiresAt` (Timestamp, `createdAt` + 7 gün)
        -   `status` (string, başlangıçta 'active', opsiyonel)
    -   **Sonuç:** Kullanıcı ana sayfaya yönlendirilir.
-   **İlanları Görüntüleme (Ana Sayfa - `/`):
    -   **Veri Çekme:** Firestore `/ads` koleksiyonundan `expiresAt` > `now` olan ilanlar çekilir.
    -   **Sıralama:**
        1.  Giriş yapmış kullanıcının kendi üniversitesindeki ilanlar (`universityDomain` eşleşmesi).
        2.  Diğer tüm ilanlar.
        3.  Her iki grup içinde `createdAt` alanına göre en yeniden eskiye doğru sıralanır.
    -   **Gösterim:** `AdCard.tsx` bileşeni kullanılır.
        -   İlanı verenin adı, profil fotoğrafı, üniversitesi.
        -   İstenen ve teklif edilenler, mesaj.
        -   Yayınlanma zamanı (`timeAgo` fonksiyonu ile "X dk/sa/g önce").
        -   Sona erme zamanı (`timeAgo` fonksiyonu ile "X dk/sa/g kaldı" veya "süresi doldu").
        -   Sahibi değilse ve süresi dolmamışsa "Yanıt Ver" butonu.
        -   "Rapor Et" butonu.

### 3.4. Takas Etkileşimleri

-   **İlana Yanıt Verme (Ana Sayfadaki `AdCard` üzerinden):
    -   **Arayüz:** Dialog açılır, kullanıcı mesajını girer.
    -   **İşlem:** Firestore `/responses` koleksiyonuna yeni yanıt eklenir:
        -   `adId` (yanıt verilen ilanın ID'si)
        -   `responderId` (yanıtı gönderenin UID'si)
        -   `adOwnerId` (ilan sahibinin UID'si - kolay sorgu için eklenebilir)
        -   `message` (string)
        -   `createdAt` (Timestamp)
        -   `isRead` (boolean, başlangıçta false - opsiyonel)
    -   **Sonuç:** Başarı mesajı gösterilir, dialog kapanır.
-   **Yanıtları Görüntüleme ("Hareketlerim" Sayfası - `/my-activity`):
    -   **Veri Çekme:**
        1.  Giriş yapmış kullanıcının `userId`'si ile eşleşen tüm ilanları (`/ads`) çekilir.
        2.  Her bir ilan için, `adId` ile eşleşen tüm yanıtları (`/responses`) çekilir.
        3.  Yanıt veren kullanıcıların detayları (`/users/{responderId}`) çekilir (ad, profil fotoğrafı, üniversite, telefon).
    -   **Gösterim:**
        -   Kullanıcının her bir ilanı listelenir.
        -   Her ilanın altında, ona gelen yanıtlar listelenir:
            -   Yanıt verenin adı, profil fotoğrafı, üniversitesi.
            -   Yanıt verenin telefon numarası (tıklanabilir `tel:` linki).
            -   Yanıt mesajı.
            -   Yanıt zamanı (`timeAgo` fonksiyonu).

### 3.5. Raporlama Sistemi

-   **Rapor Etme (İlan Kartındaki `AdCard` üzerinden):
    -   **Arayüz:** Dialog açılır, kullanıcı raporlama sebebini seçer (Spam, Kötüye Kullanım, Yanlış Bilgi, Uygunsuz İçerik, Diğer).
    -   **İşlem:** Firestore `/reports` koleksiyonuna yeni rapor eklenir:
        -   `reporterId` (raporu gönderenin UID'si)
        -   `reportedUserId` (raporlanan kullanıcının UID'si)
        -   `adId` (eğer bir ilanla ilgiliyse, ilanın ID'si)
        -   `reason` (string)
        -   `details` (string, "Diğer" seçilirse ek açıklama için - opsiyonel)
        -   `createdAt` (Timestamp)
    -   **Sonuç:** Başarı mesajı gösterilir, dialog kapanır.

## 4. Firestore Veritabanı Şeması

### 4.1. `users` Koleksiyonu

-   Doküman ID: `userId` (Firebase Auth UID)
-   Alanlar:
    -   `name`: string (Ad Soyad)
    -   `email`: string (Kullanıcının .edu.tr e-postası)
    -   `phone`: string (Telefon numarası)
    -   `universityDomain`: string (e-postadan parse edilen üniversite alan adı, örn: `itu.edu.tr`)
    -   `profilePhotoUrl`: string (Firebase Storage'daki profil fotoğrafının URL'si, boş olabilir)
    -   `createdAt`: Timestamp (Kullanıcı kaydının oluşturulma zamanı)
    -   `activeAdCount`: number (Kullanıcının aktif ilan sayısı - denormalize edilebilir veya sorgu ile bulunabilir)

### 4.2. `ads` Koleksiyonu

-   Doküman ID: Otomatik generate edilen ID
-   Alanlar:
    -   `userId`: string (İlanı veren kullanıcının UID'si)
    -   `universityDomain`: string (İlanı veren kullanıcının üniversitesi)
    -   `requested`: string (İstenen sigara)
    -   `offered`: string (Teklif edilenler)
    -   `message`: string (İsteğe bağlı ek mesaj, boş olabilir)
    -   `createdAt`: Timestamp (İlanın oluşturulma zamanı)
    -   `expiresAt`: Timestamp (İlanın sona erme zamanı, `createdAt` + 7 gün)
    -   `status`: string (örn: `active`, `expired`, `deleted` - opsiyonel, varsayılan `active`)

### 4.3. `responses` Koleksiyonu

-   Doküman ID: Otomatik generate edilen ID
-   Alanlar:
    -   `adId`: string (Yanıt verilen ilanın ID'si)
    -   `adOwnerId`: string (İlan sahibinin UID'si)
    -   `responderId`: string (Yanıtı gönderen kullanıcının UID'si)
    -   `message`: string (Yanıt mesajı)
    -   `createdAt`: Timestamp (Yanıtın oluşturulma zamanı)
    -   `isRead`: boolean (İlan sahibi tarafından okunup okunmadığı, varsayılan `false` - opsiyonel)

### 4.4. `reports` Koleksiyonu

-   Doküman ID: Otomatik generate edilen ID
-   Alanlar:
    -   `reporterId`: string (Raporu gönderen kullanıcının UID'si)
    -   `reportedUserId`: string (Raporlanan kullanıcının UID'si)
    -   `adId`: string (Eğer bir ilanla ilgiliyse, ilanın ID'si, boş olabilir)
    -   `reason`: string (Raporlama sebebi: `Spam`, `Kötüye Kullanım`, `Yanlış Bilgi`, `Uygunsuz İçerik`, `Diğer`)
    -   `details`: string (Eğer `reason` "Diğer" ise ek açıklama, boş olabilir)
    -   `createdAt`: Timestamp (Raporun oluşturulma zamanı)
    -   `status`: string (örn: `pending_review`, `resolved`, `dismissed` - admin paneli için, varsayılan `pending_review`)

## 5. Ek Notlar ve İyileştirmeler

-   **`timeAgo` Fonksiyonu (`src/components/ads/AdCard.tsx` içinde):
    -   Türkçe zaman birimleri (sn, dk, sa, g) kullanır.
    -   Gelecekteki tarihler için ("X kaldı") ve geçmişteki tarihler için ("X önce") formatlama yapar.
    -   Süresi dolmuş ilanlar için "süresi doldu" metnini gösterir.
-   **Telefon Numarası Formatlama/Doğrulama:** Basit bir regex ile Türkiye formatı kontrolü yapılmıştır. Daha kapsamlı bir kütüphane kullanılabilir.
-   **`.edu.tr` Doğrulaması:** E-posta sonundaki `.edu.tr` kontrolü ile yapılmıştır.
-   **Maksimum Aktif İlan:** Kullanıcıların yeni ilan vermeden önce `/ads` koleksiyonunda kendi `userId`'leri ve aktif durumdaki ilanları sayılır.
-   **UI/UX:** Shadcn/ui ve Tailwind CSS ile temel, işlevsel bir arayüz sağlanmıştır. Yükleme durumları, hata mesajları ve kullanıcı geri bildirimleri eklenmiştir.

## 6. Gelecekteki İyileştirmeler (Nice to Have)

-   **Anlık Bildirimler (Push Notifications):**
    -   Firebase Cloud Messaging (FCM) kullanarak yeni ilan yanıtları, rapor güncellemeleri vb. için anlık bildirimler.
-   **Gelişmiş İlan Filtreleme ve Sıralama:**
    -   Ana sayfada ilanları fiyata (teklif edilen değere göre - bu karmaşık olabilir), sigara markasına, üniversiteye göre filtreleme.
    -   Popülerliğe veya en çok yanıt alana göre sıralama seçenekleri.
-   **Kullanıcı Puanlama/Değerlendirme Sistemi:**
    -   Başarılı takaslar sonrası kullanıcıların birbirlerine 1-5 yıldız arası puan verebilmesi ve yorum bırakabilmesi.
    -   Kullanıcı profillerinde ortalama puanların gösterilmesi.
-   **Admin Paneli/Arayüzü:**
    -   Raporları inceleme ve yönetme (kullanıcıya uyarı gönderme, ilanı silme, kullanıcıyı askıya alma/banlama).
    -   Genel istatistikleri görüntüleme (aktif kullanıcı, ilan sayısı vb.).
    -   Veritabanı üzerinde manuel düzenleme (dikkatli kullanım gerektirir).
-   **İlan Düzenleme ve Silme:**
    -   Kullanıcıların kendi yayınladıkları aktif ilanları düzenleyebilmesi (süre dolmadan).
    -   Kullanıcıların kendi ilanlarını silebilmesi.
-   **Dahili Mesajlaşma/Sohbet:**
    -   İlan sahibi ve yanıt veren arasında, yanıt üzerinden başlatılabilen basit bir sohbet arayüzü.
    -   Okundu bilgisi, yeni mesaj bildirimi (uygulama içinde).
-   **Şifre Sıfırlama:**
    -   Giriş sayfasında "Şifremi Unuttum" bağlantısı ile Firebase'in şifre sıfırlama e-postası gönderme özelliğinin entegrasyonu.
-   **Karanlık Mod (Dark Mode):**
    -   Kullanıcı arayüzü için değiştirilebilir tema seçeneği.
-   **Gelişmiş Arama:**
    -   İlan başlıklarında, açıklamalarda veya kullanıcı adlarında anahtar kelime ile arama.
-   **Kaydedilen/Favori İlanlar:**
    -   Kullanıcıların ilgilendikleri ilanları daha sonra kolayca bulmak için kaydetme özelliği.
-   **Topluluk Kuralları/Yardım Sayfası:**
    -   Uygulama içinde platformun kullanım kurallarını ve SSS'leri içeren bir bölüm.

Bu doküman, projenin mevcut durumunu yansıtmaktadır ve geliştirme sürecinde güncellenebilir. 