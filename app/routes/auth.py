
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from ..models import User
from .. import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.get('/login')
def login():
    return render_template('login.html')

@auth_bp.post('/login')
def login_post():
    email = request.form.get('email')
    password = request.form.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        login_user(user)
        return redirect(url_for('public.home'))
    flash('Credenciais inválidas.')
    return redirect(url_for('auth.login'))

@auth_bp.get('/registrar')
def register():
    return render_template('register.html')

@auth_bp.post('/registrar')
def register_post():
    name = request.form.get('name')
    email = request.form.get('email')
    password = request.form.get('password')
    cep = request.form.get('cep')
    if User.query.filter_by(email=email).first():
        flash('E-mail já cadastrado.')
        return redirect(url_for('auth.register'))
    u = User(name=name, email=email, cep=cep)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    flash('Conta criada! Faça login.')
    return redirect(url_for('auth.login'))

@auth_bp.get('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('public.home'))
