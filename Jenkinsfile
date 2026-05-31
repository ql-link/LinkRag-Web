pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        REGISTRY    = 'registry.example.com/tolink'   // TODO: 改成你的镜像仓库
        IMAGE_NAME  = 'linkrag-web'
        IMAGE       = "${REGISTRY}/${IMAGE_NAME}"
        TAG         = "${env.GIT_COMMIT?.take(8) ?: env.BUILD_NUMBER}"
        DEPLOY_HOST = 'deploy@your-server'             // TODO: 部署目标主机
        DEPLOY_DIR  = '/opt/tolink/LinkRag-Web'        // 目标机上放 deploy/docker-compose.yml 的目录
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
                sh 'npm ci'
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

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'registry-cred',
                        usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh '''
                        echo "$REG_PASS" | docker login ${REGISTRY%%/*} -u "$REG_USER" --password-stdin
                        docker push ${IMAGE}:${TAG}
                        docker push ${IMAGE}:latest
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sshagent(credentials: ['deploy-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_HOST} '
                            cd ${DEPLOY_DIR} &&
                            export REGISTRY=${REGISTRY} TAG=${TAG} &&
                            docker compose -f deploy/docker-compose.yml pull &&
                            docker compose -f deploy/docker-compose.yml up -d
                        '
                    """
                }
            }
        }
    }

    post {
        always  { sh 'docker image prune -f || true' }
        success { echo "Deployed ${IMAGE}:${TAG}" }
        failure { echo 'Build failed.' }
    }
}
