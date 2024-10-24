import 'jest';
import supertest from 'supertest';
import app from '../../app';
import User from '../../models/user-model';
import { LoginRequest, RegisterRequest } from '../../shared/interfaces/auth';

const agent = supertest.agent(app);

describe('User Controller', () => {
  const baseURL = '/api/auth';
  const registerURL = `${baseURL}/register`;
  const loginURL = `${baseURL}/login`;
  describe('register', () => {
    test('should register a new user', async () => {
      const register: RegisterRequest = {
        email: 'email@email.com',
        password: 'Password123!!@@',
        confirmPassword: 'Password123!!@@',
        dateOfBirth: new Date(),
        firstName: 'John',
        surname: 'Doe',
        phoneNumber: '1234567890',
      };
      const response = await agent.post(registerURL).send(register);

      const user = await User.find({ email: register.email });

      expect(response.statusCode).toBe(200);
    });

    test('should register and verify a new user', async () => {
      const register: RegisterRequest = {
        email: 'email1@email.com',
        password: 'Password123!!@@',
        confirmPassword: 'Password123!!@@',
        dateOfBirth: new Date(),
        firstName: 'John',
        surname: 'Doe',
        phoneNumber: '1234567890',
      };
      const response = await agent.post(registerURL).send(register);
      const user = await User.findOne({ email: register.email });
      // Cheap way to avoid sending an email.
      if (user) {
        user.verified = true;
        await user?.save();
      }
      expect(response.statusCode).toBe(200);
    });

    test('should not register a new user with an invalid email', async () => {
      const register: RegisterRequest = {
        email: 'email',
        password: 'password',
        confirmPassword: 'password',
        dateOfBirth: new Date(),
        firstName: 'John',
        surname: 'Doe',
        phoneNumber: '1234567890',
      };
      const response = await agent.post(registerURL).send(register);

      expect(response.statusCode).toBe(400);
    });

    test('should not register a new user with an invalid password', async () => {
      const register: RegisterRequest = {
        email: 'email',
        password: 'pass',
        confirmPassword: 'pass',
        dateOfBirth: new Date(),
        firstName: 'John',
        surname: 'Doe',
        phoneNumber: '1234567890',
      };
      const response = await agent.post(registerURL).send(register);

      expect(response.statusCode).toBe(400);
    });

    test('should not register a new user with an invalid date of birth', async () => {
      const register: RegisterRequest = {
        email: 'email',
        password: 'Password123!!@@',
        confirmPassword: 'Password123!!@@',
        dateOfBirth: new Date(''),
        firstName: 'John',
        surname: 'Doe',
        phoneNumber: '1234567890',
      };
      const response = await agent.post(registerURL).send(register);

      expect(response.statusCode).toBe(400);
    });
  });
  describe('login', () => {
    test('should login a user', async () => {
      const login: LoginRequest = {
        email: 'email1@email.com',
        password: 'Password123!!@@',
      };
      const response = await agent.post(loginURL).send(login);

      expect(response.statusCode).toBe(200);
    });
  });
});
