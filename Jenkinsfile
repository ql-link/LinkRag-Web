pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        IMAGE      = 'linkrag-web'
        TAG        = "${env.GIT_COMMIT?.take(8) ?: env.BUILD_NUMBER}"
        DEPLOY_DIR = '/opt/tolink/LinkRag-Web'   // TODO: 本机部署目录，内含 deploy/docker-compose.yml
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install & Lint & Test') {
            agent {
                docker { image 'node:20-alpine'; reuseNode true }
            }
            steps {
                sh 'npm install --registry=https://registry.npmmirror.com'
                sh 'npm run typecheck'
                sh 'npm run lint'
                sh 'npm run test'
            }
        }

        stage('Build Image') {
            steps {
                sh """
                    DOCKER_BUILDKIT=1 docker build \
                        -t ${IMAGE}:${TAG} -t ${IMAGE}:latest \
                        --build-arg VITE_GITHUB_URL=https://github.com/ql-link/LinkRag \
                        .
                """
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    cd ${DEPLOY_DIR}
                    export TAG=${TAG}
                    docker compose -f deploy/docker-compose.yml up -d
                """
            }
        }
    }

    post {
        always  { sh 'docker image prune -f || true' }
        success { echo "Deployed ${IMAGE}:${TAG}" }
        failure { echo 'Build failed.' }
    }
}
