
pipeline {
    agent any

    stages {
        stage('Checkout GitHub Repository') {
            steps {
                checkout scm
            }
        }

        stage('Backend Dependency Security Scan') {
            steps {
                sh '''
                    tar -C backend -cf - package.json package-lock.json |
                    docker run --rm -i node:24-alpine sh -c '
                        mkdir -p /app
                        cd /app
                        tar -xf -
                        npm audit --omit=dev --audit-level=high
                    '
                '''
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                sh '''
                    docker build -t ai-devsecops-backend:ci ./backend
                '''
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                sh '''
                    docker build -t ai-devsecops-frontend:ci ./frontend
                '''
            }
        }

        stage('Trivy Backend Security Scan') {
            steps {
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 1 \
                        ai-devsecops-backend:ci
                '''
            }
        }

        stage('Trivy Frontend Security Scan') {
            steps {
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 1 \
                        ai-devsecops-frontend:ci
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: npm audit and Trivy scans passed. Docker images built.'
        }

        failure {
            echo 'FAILED: Security vulnerabilities detected or build error.'
        }

        always {
            echo 'Jenkins CI pipeline execution completed.'
        }
    }
}
