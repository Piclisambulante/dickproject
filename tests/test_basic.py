
import os, tempfile, pytest
from app import create_app, db
from app.models import User, Product

@pytest.fixture
def app():
    os.environ['FLASK_ENV'] = 'testing'
    app = create_app()
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    with app.app_context():
        db.create_all()
        # seed
        p = Product(name='Brigadeiro', price_cents=200, stock=100)
        db.session.add(p)
        u = User(name='Admin', email='admin@test.com', cep='80000-000', is_admin=True)
        u.set_password('123')
        db.session.add(u)
        db.session.commit()
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

def test_home(client):
    r = client.get('/')
    assert r.status_code == 200

def test_cardapio_lists_product(client):
    r = client.get('/cardapio')
    assert b'Brigadeiro' in r.data

def test_login_and_admin_access(client, app):
    r = client.post('/login', data={'email':'admin@test.com','password':'123'})
    assert r.status_code == 302
    r = client.get('/admin/')
    assert r.status_code == 200
