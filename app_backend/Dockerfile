# Use an official Node.js runtime as a parent image
FROM node:18.16-slim as build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# production stage
FROM node:18.16-slim as production

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the built JavaScript code from the build image
COPY --from=build /usr/src/app/dist ./dist

# Expose port
EXPOSE 3001

# Run the web service on container startup.
CMD ["node", "dist/index.js"]
