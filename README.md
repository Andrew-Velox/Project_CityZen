# Project_CityZen


## Run the backend server
```bash
cd cityzen_backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python -m daphne -b 127.0.0.1 -p 8000 askrag.asgi:application 
# python manage.py runserver
python manage.py runserver 0.0.0.0:8000
```


- [ ] Backend Feature Checklist
    - [x] User signup
    - [x] User login
    - [x] User profile view
    - [x] User profile update
    - [x] Password change
    - [ ] Chat Model
    - [ ] Map model
    - [ ] Comment model
    - [ ] Report model
    - [ ] Community model
- [ ] Frontend Feature Checklist