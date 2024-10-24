# Use an official Node runtime as a base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Globally install nodemon for hot reloading and TypeScript
RUN npm install -g nodemon typescript

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose port 80
EXPOSE 8080

# Command to run the application
CMD ["nodemon", "-L", "src/app.ts"]
