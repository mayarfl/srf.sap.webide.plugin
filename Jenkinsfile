#!groovy
import java.util.Date
import java.text.SimpleDateFormat

def srfLib = null 
def utility = null
pipeline {
    agent {
        node {
            label 'PIPELINE'
        }
    }

    options { 
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps() 
    }

    environment {
        REPO_NAME = 'srf.sap.webide.plugin'
    }

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: '', description: '')
    }
    
    stages {

        stage('Dummy stage for syncing commits with Octane') {
            steps {
                script {
                    srfLib = library("srf.jenkins.pipeline@${params.BRANCH_NAME}").com.hpe.pipeline
                    echo "${env.REPO_NAME} in branch ${params.BRANCH_NAME} was pushed. Please look at the new commits!"
                }
            }
        } 

        stage('Tag Git with current date and time') {
            steps {
                script {
                    def dateFormat = new SimpleDateFormat("yyyy-MM-dd-HH-mm")
                    def date = new Date()
                    def timeTag = dateFormat.format(date).toString() + "-Jenkins-" + env.BUILD_NUMBER
                    utility = srfLib.Utility.new(this, this.steps)
                    echo "Tagging ${env.REPO_NAME} on branch ${params.BRANCH_NAME} with tag \"${timeTag}\""
                    utility.GitTag(env.REPO_NAME.toString(), timeTag, params.BRANCH_NAME.toString())
                }
            }
        } 
	}
    
    post { 
		always { 
			sendNotification()
		}	
	}
}
