
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
                        npm audit --audit-level=critical
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
    }

    post {
        success {
            echo 'SUCCESS: Security scan passed and Docker images built.'
        }

        failure {
            echo 'FAILED: Security vulnerabilities detected or build error.'
        }

        always {
            echo 'Jenkins CI pipeline execution completed.'
        }
    }
}
