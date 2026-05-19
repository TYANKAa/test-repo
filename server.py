import os
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from voyager import Index, Space

app = FastAPI(title="Obsidian RAG Backend")

if torch.backends.mps.is_available():
    device = "mps"
    print("🚀 Используем графический чип Mac (MPS)")
else:
    device = "cpu"
    print("🐢 Используем обычный процессор (CPU)")

print("📥 Загрузка модели LaBSE...")
model = SentenceTransformer('sentence-transformers/LaBSE', device=device)

DIMENSION = 768
INDEX_FILE = "obsidian_index.voy"
MAPPING_FILE = "chunks_mapping.txt"

if os.path.exists(INDEX_FILE):
    print("💾 Загружаем существующий индекс Voyager...")
    index = Index.load(INDEX_FILE)
    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        chunks_db = [line.strip() for line in f.readlines()]
else:
    print("🆕 Создаем новый индекс Voyager...")
    index = Index(Space.Cosine, num_dimensions=DIMENSION)
    chunks_db = []

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100):
    """ Нарезает текст на куски по количеству символов с перекрытием """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

class SearchRequest(BaseModel):
    prompt: str

@app.post("/index-file")
async def index_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="Разрешены только .md файлы")
    
    try:
        content = await file.read()
        text = content.decode("utf-8")
        
        chunks = chunk_text(text)
        if not chunks:
            return {"status": "skipped", "message": "Файл пустой"}
        
        embeddings = model.encode(chunks, convert_to_tensor=False, show_progress_bar=False)
        
        for i, embedding in enumerate(embeddings):
            global chunks_db
            vector_id = len(chunks_db)
            
            index.add_item(embedding, id=vector_id)
            chunks_db.append(chunks[i])
            
        index.save(INDEX_FILE)
        with open(MAPPING_FILE, "w", encoding="utf-8") as f:
            for chunk in chunks_db:
                cleaned_chunk = chunk.replace("\n", " ")
                f.write(f"{cleaned_chunk}\n")
                
        return {
            "status": "success", 
            "filename": file.filename, 
            "chunks_added": len(chunks)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки: {str(e)}")


@app.post("/get-context")
async def get_context(request: SearchRequest):
    if not chunks_db:
        return {"context": "База знаний пуста. Сначала проиндексируйте файлы."}
    
    try:
        query_embedding = model.encode(request.prompt, convert_to_tensor=False)

        neighbors_ids, distances = index.query(query_embedding, k=1)
        
        retrieved_chunks = []
        for vector_id in neighbors_ids:
            if vector_id < len(chunks_db):
                retrieved_chunks.append(chunks_db[vector_id])
        
        final_context = "\n\n---\n\n".join(retrieved_chunks)
        
        return {"context": final_context}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
