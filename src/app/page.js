"use client"; // Next.js'te istemci tarafı kodu olduğunu belirtmek için eklenir

// React hook'ları ve gerekli kütüphaneler import ediliyor
import { useState, useEffect, useRef } from "react";
import Papa from "papaparse"; // CSV verilerini işlemek için PapaParse kütüphanesi
import styles from './Home.module.css' // CSS modülleri ile stil import ediliyor


const Home = () => {
  const Papa = require('papaparse'); // PapaParse kütüphanesi yeniden tanımlanıyor (gereksiz)

  // Kullanıcıya gösterilecek çeşitli state'ler tanımlanıyor
  const [films, setFilms] = useState([]); // Film bilgileri
  const [currentFilmIndex, setCurrentFilmIndex] = useState(0); // Şu anki film index'i
  const [guess, setGuess] = useState([]); // Kullanıcının yaptığı tahmin
  const [score, setScore] = useState(0); // Kullanıcının puanı
  const [message, setMessage] = useState(""); // Mesaj (Tebrikler ya da Yanlış)
  const [shownHints, setShownHints] = useState([]); // Gösterilen ipuçları
  const [isGuessCorrect, setIsGuessCorrect] = useState(false); // Tahmin doğru mu?
  const [timer, setTimer] = useState(120); // Zamanlayıcı (120 saniye)
  const inputRefs = useRef([]); // Kullanıcı inputlarını takip etmek için referans
  const timerRef = useRef(null); // Zamanlayıcıyı yönetmek için referans
  const [continueClickCount, setContinueClickCount] = useState(0); // Devam et butonunun kaç kez tıklandığını sayar
  const [showPopup, setShowPopup] = useState(false); // Popup gösterme durumu

  const imdb_top = 50; // En iyi 50 film
  const how_many_tour = 10; // Kaç tur oynanacağı
  const api_key = "dece67f8"; // OMDB API anahtarı

  // useEffect hook'u ile film verileri çekiliyor
  useEffect(() => {
    let isMounted = true;

    async function fetchMovies() {
      if (!isMounted) return; // Komponent hala mount edilmediyse işlemi durdur

      try {
        const response = await fetch("/IMDB_top_10_movies.csv"); // CSV dosyasını çek
        const csvData = await response.text(); // Dosya içeriğini metne çevir

        // PapaParse kullanarak CSV'yi işle
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: async (result) => {
            if (!isMounted) return; // Komponent hala mount edilmediyse işlemi durdur

            // Verileri filtrele, sadece ilk 50 filmi al
            const rankedMovies = result.data.filter((row) => {
              const rank = parseInt(row.Rank, 10);
              return rank >= 1 && rank <= imdb_top;
            });

            if (rankedMovies.length === 0) {
              console.error("Geçerli film bulunamadı!");
              return;
            }

            // Rastgele bir film seç
            const randomIndex = Math.floor(Math.random() * rankedMovies.length);
            const randomMovie = rankedMovies[randomIndex];
            console.log("Rastgele Seçilen Film (CSV'den):", randomMovie.Title);

            // OMDB API'den filmin detaylarını çek
            const movieResponse = await fetch(
              `https://www.omdbapi.com/?t=${randomMovie.Title}&apikey=${api_key}`
            );
            const movieData = await movieResponse.json();
            if (movieData.Response === "False") {
              console.error("Film bulunamadı:", randomMovie.Title);
              return;
            }

            // Filmi ve ipuçlarını oluştur
            const movie = {
              title: movieData.Title.trim().toLowerCase() || "bilinmeyen",
              hint: [
                `Aktörler: ${movieData.Actors || "bilinmeyen"}`,
                `Tür: ${movieData.Genre || "bilinmeyen"}`,
                `Yapım Yılı: ${movieData.Year || "bilinmeyen"}`,
                `Yönetmen: ${movieData.Director || "bilinmeyen"}`,
                `IMDB Puanı: ${movieData.imdbRating || "bilinmeyen"}`,
              ],
              poster: movieData.Poster || "", // Poster URL'si
            };

            setFilms([movie]); // Film bilgisini state'e kaydet
            setGuess(
              movie.title.split(" ").map((word) => Array(word.length).fill("")) // Boş tahminler
            );
          },
        });
      } catch (error) {
        console.error("Filmler yüklenirken hata oluştu: ", error);
      }
    }

    fetchMovies();

    return () => {
      isMounted = false; // Komponent unmount olduğunda işlemleri durdur
    };
  }, []); // Boş bağımlılık dizisi ile sadece komponent mount olduğunda çalışır

  // Zamanlayıcıyı yönetmek için bir başka useEffect
  useEffect(() => {
    if (timer === 0) {
      handleGuessSubmit(); // Zaman bitince tahmini gönder
    }
    if (timerRef.current) {
      clearInterval(timerRef.current); // Önceki zamanlayıcıyı temizle
    }
    timerRef.current = setInterval(() => {
      setTimer((prevTimer) => (prevTimer > 0 ? prevTimer - 1 : 0)); // Zamanı her saniye bir azalt
    }, 1000);

    return () => clearInterval(timerRef.current); // Komponent unmount olduğunda zamanlayıcıyı temizle
  }, [timer]);

  // Kullanıcı inputu değiştirirken yapılacak işlemler
  const handleInputChange = (wordIndex, letterIndex, value) => {
    if (value.length > 1) return; // Birden fazla karakter girilemez

    const newGuess = [...guess];
    newGuess[wordIndex][letterIndex] = value.toLowerCase(); // Girilen harfi kaydet
    setGuess(newGuess);

    // Eğer harf girildiyse, sonraki harfe geçiş yap
    if (value && letterIndex < guess[wordIndex].length - 1) {
      inputRefs.current[wordIndex][letterIndex + 1]?.focus();
    } else if (
      value &&
      wordIndex < guess.length - 1 &&
      letterIndex === guess[wordIndex].length - 1
    ) {
      inputRefs.current[wordIndex + 1]?.[0]?.focus();
    }
  };

  // Backspace tuşuna basıldığında yapılacak işlemler
  const handleKeyDown = (wordIndex, letterIndex, event) => {
    if (event.key === "Backspace") {
      const newGuess = [...guess];
      newGuess[wordIndex][letterIndex] = ""; // Harf sil
      setGuess(newGuess);

      // Silinen harften önceki harfe geçiş yap
      if (letterIndex > 0) {
        inputRefs.current[wordIndex][letterIndex - 1]?.focus();
      } else if (wordIndex > 0) {
        inputRefs.current[wordIndex - 1]?.[guess[wordIndex - 1].length - 1]?.focus();
      }
    }
  };

  // Kullanıcı bir metin kopyaladığında yapılacak işlemler
  const handlePaste = (wordIndex, letterIndex, event) => {
    const pastedText = event.clipboardData.getData("Text").toLowerCase(); // Yapıştırılan metni al
    const newGuess = [...guess];

    let currentWordIndex = wordIndex;
    let currentLetterIndex = letterIndex;

    // Yapıştırılan metni tahmin alanına dağıt
    for (let i = 0; i < pastedText.length; i++) {
      if (currentLetterIndex >= newGuess[currentWordIndex].length) {
        currentWordIndex++; // Bir sonraki kelimeye geç
        currentLetterIndex = 0;

        if (currentWordIndex >= newGuess.length) {
          break;
        }
      }

      newGuess[currentWordIndex][currentLetterIndex] = pastedText[i]; // Harfleri yerleştir
      currentLetterIndex++;
    }

    setGuess(newGuess); // Yeni tahmini state'e kaydet
    event.preventDefault(); // Varsayılan yapıştırma işlemini engelle
  };

  // İpucu gösterme fonksiyonu
  const addHint = () => {
    const remainingHints = films[currentFilmIndex]?.hint.filter(
      (hint, index) => !shownHints.includes(index) // Henüz gösterilmeyen ipuçlarını al
    );
    if (remainingHints?.length > 0) {
      setScore((prev) => prev - 10); // Puanı azalt
      setShownHints((prev) => [
        ...prev,
        films[currentFilmIndex].hint.indexOf(remainingHints[0]), // Yeni ipucu ekle
      ]);
    }
  };

  // Tahmin gönderme fonksiyonu
  const handleGuessSubmit = () => {
    const currentGuess = guess.map((word) => word.join("")).join(" ").toLowerCase(); // Tahmini birleştir
    const correctAnswer = films[currentFilmIndex]?.title; // Doğru cevap

    if (currentGuess === correctAnswer) {
      setMessage("Correct!"); // Doğru cevap
      setScore((prev) => prev + timer + 60); // Puanı arttır
      setIsGuessCorrect(true); // Cevap doğru oldu
    } else {
      setMessage("Yanlış Cevap! Tekrar Deneyin."); // Yanlış cevap
    }
  };

  // Yeni bir film seçme fonksiyonu
  const fetchNewFilm = async () => {
    setTimer(120); // Zamanı sıfırla
    setIsGuessCorrect(false); // Cevabı yanlış yap
    try {
      const response = await fetch("/IMDB_top_10_movies.csv"); // CSV dosyasını çek
      const csvData = await response.text(); // Dosya içeriğini metne çevir

      // PapaParse kullanarak CSV'yi işle
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          const rankedMovies = result.data.filter((row) => {
            const rank = parseInt(row.Rank, 10);
            return rank >= 1 && rank <= imdb_top; // İlk 50 filmi al
          });

          if (rankedMovies.length === 0) {
            console.error("Geçerli film bulunamadı!");
            return;
          }

          const randomIndex = Math.floor(Math.random() * rankedMovies.length);
          const randomMovie = rankedMovies[randomIndex];

          const movieResponse = await fetch(
            `https://www.omdbapi.com/?t=${randomMovie.Title}&apikey=${api_key}`
          );
          const movieData = await movieResponse.json();
          if (movieData.Response === "False") {
            console.error("Film bulunamadı:", randomMovie.Title);
            return;
          }

          const movie = {
            title: movieData.Title.trim().toLowerCase() || "bilinmeyen", // Film başlığı
            hint: [
              `Tür: ${movieData.Genre || "bilinmeyen"}`,
              `Yapım yılı: ${movieData.Year || "bilinmeyen"}`,
              `Yönetmen: ${movieData.Director || "bilinmeyen"}`,
              `IMDB Puanı: ${movieData.imdbRating || "bilinmeyen"}`,
            ],
            poster: movieData.Poster || "", // Poster URL'si
          };

          setFilms([movie]); // Yeni film set et
          setGuess(
            movie.title.split(" ").map((word) => Array(word.length).fill("")) // Boş tahminler
          );
          setShownHints([]); // İpuçlarını sıfırla
          setMessage(""); // Mesajı sıfırla
          setIsGuessCorrect(false); // Cevap doğru olmadı
          console.log("Yeni Film Seçildi: ", movie.title);
        },
      });
    } catch (error) {
      console.error("Yeni film yüklenirken hata oluştu: ", error);
    }
  };

  // Devam et butonuna tıklandığında yapılacak işlemler
  const handleContinueClick = () => {
    setContinueClickCount((prevCount) => prevCount + 1); // Tık sayısını arttır
    if (continueClickCount + 1 === how_many_tour) {
      setShowPopup(true); // Popup'ı göster
      setContinueClickCount(0); // Sayacı sıfırla
    } else {
      fetchNewFilm(); // Yeni film getir
    }
  };

// handleRefresh fonksiyonu, sayfanın yenilenmesini sağlar.
const handleRefresh = () => {
  window.location.reload();  // Sayfa yenilenir.
};

// Ana render kısmı
return (
   // Uygulama konteyneri, stil sınıfı 'app' ile.
<div className={styles.app}>   
  <h1 className={styles.title}>Film Tahmin Oyunu</h1>  
  <div className={styles.score}>Skor: {score}</div>  
  <div className={styles.timer}>Kalan Zaman: {timer} Saniye</div>  
  
  {films.length > 0 && (  // Eğer film verisi varsa aşağıdaki kısmı render et.
    <div className={styles.guessGrid}>  
      {guess.map((word, wordIndex) => (  // Tahmin edilen kelimeler üzerinde döngü.
        <div key={wordIndex} className={styles.word}>  
          {word.map((letter, letterIndex) => (  // Her kelimenin harfleri üzerinde döngü.
            <input
              key={letterIndex}  // Her harfe benzersiz bir anahtar atar.
              value={letter}  // Harfi input'un değeri olarak atar.
              onChange={(e) =>  // Harf değiştiğinde fonksiyonu tetikler.
                handleInputChange(wordIndex, letterIndex, e.target.value)
              }
              onKeyDown={(e) => handleKeyDown(wordIndex, letterIndex, e)}  // Klavye tuşuna basıldığında tetiklenir.
              onPaste={(e) => handlePaste(wordIndex, letterIndex, e)}  // Yapıştırma işlemi gerçekleştiğinde tetiklenir.
              ref={(el) => {  // input elementini referans olarak saklar.
                if (!inputRefs.current[wordIndex]) {
                  inputRefs.current[wordIndex] = [];
                }
                inputRefs.current[wordIndex][letterIndex] = el;
              }}
              maxLength={1}  // Her input kutusu yalnızca bir harf kabul eder.
              className={styles.letterInput}  // Input'a stil sınıfı 'letterInput' atanır.
            />
          ))}
        </div>
      ))}
    </div>
  )}

  {films.length > 0 && message === "Correct!" ? (  // Eğer film verisi varsa ve mesaj "Tebrikler!" ise, 'Devam Et!' butonu.
    <button className={styles.button} onClick={handleContinueClick}>Devam Et!</button>
  ) : (  // Eğer mesaj farklıysa 'Tahmin Et!' butonu.
    <button className={styles.button} onClick={handleGuessSubmit}>Tahmin Et!</button>
  )}

  <div className={styles.message}>{message}</div>  
  <button className={styles.button} onClick={addHint}>İpucu Göster</button>  

  <div className={styles.hintsTable}>
  {shownHints.length > 0 && (
    <table>
      <thead>
        <tr>
          <th>İpucu</th>
        </tr>
      </thead>
      <tbody>
        {shownHints.map((hintIndex) => {
          const hint = films[currentFilmIndex]?.hint[hintIndex];
          return (
            <tr key={hintIndex}>
              <td>
                {hint.type === "poster" ? (
                  <img src={hint.content} alt="Film Poster" className={styles.poster} />
                ) : (
                  hint
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  )}
</div>


  {isGuessCorrect && films[currentFilmIndex]?.poster && (  // Tahmin doğruysa ve film posteri varsa aşağıdaki kısmı render et.
    <div className={styles.posterFrame}>  
      <img
        src={films[currentFilmIndex].poster}  // Film posterinin kaynağını belirtir.
        alt="Film Poster"  // Görsel açıklaması.
        className={styles.posterImg}  // Posterin stil sınıfı.
        style={{
          width: "300px",  // Posterin genişliği.
          height: "440px",  // Posterin yüksekliği.
          objectFit: "cover",  // Resmin boyutlarına göre uygun şekilde sığdırılmasını sağlar.
        }}
      />
    </div>
  )}

  {showPopup && (  // Eğer pop-up gösterilmek isteniyorsa aşağıdaki kısmı render et.
    <div className={styles.popup}>  
      <div className={styles.popupContent}>
        <h2>Oyun Bitti!</h2>  
        <p>Skorun: {score}</p>  
        <button className={styles.button} onClick={handleRefresh}>Yeni Oyun</button> 
      </div>
    </div>
  )}
</div>
);
}
export default Home;
