from sentence_transformers import SentenceTransformer
import torch

# 1. Проверяем процессор Мака (если Apple Silicon M1/M2/M3/M4, включаем ускорение MPS)
if torch.backends.mps.is_available():
    device = "mps"
    print("Используем графический чип Mac (MPS)")
else:
    device = "cpu"
    print("Используем обычный процессор (CPU)")

# 2. Загружаем модель LaBSE локально (в первый раз скачается ~1.88 ГБ)
print("Загрузка модели LaBSE...")
model = SentenceTransformer('sentence-transformers/LaBSE', device=device)

# 3. Наш двуязычный список текстов для векторизации
sentences = [
    "Привет, как твои дела?", 
    "Hello, how are you doing?", 
    "Искусственный интеллект меняет мир.",
    "Artificial intelligence is changing the world."
]

# 4. Получаем векторы (эмбеддинги)
print("Векторизация текстов...")
embeddings = model.encode(sentences, convert_to_tensor=True)

# Результат
print("\nУспешно! Формат матрицы эмбеддингов:", embeddings.shape)
# Размерность будет [4, 768] — 4 предложения, у каждого вектор из 768 чисел

# Посмотрим на первые 5 чисел вектора для первого предложения
print("Фрагмент вектора первой фразы:", embeddings[0][:5].tolist())
