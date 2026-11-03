from fastapi import FastAPI

app = FastAPI()

def active_python_worker():
    return {"status": "ok"}

@app.get('/api/py/data')
def get_data():
    return active_python_worker()

if __name__ == '__main__':
    get_data()
