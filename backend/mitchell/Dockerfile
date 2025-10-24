# Mitchell Brain Prediction Lambda - Production Container
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for building Python packages
# gcc, g++ needed for matplotlib/contourpy
RUN yum install -y gcc gcc-c++ && yum clean all

# Copy requirements and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install Python dependencies
# This will take a few minutes due to numpy, scipy, sklearn, torch
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/
COPY handlers/ ${LAMBDA_TASK_ROOT}/handlers/
COPY shared/ ${LAMBDA_TASK_ROOT}/shared/

# Set the main handler
CMD [ "lambda_function.handler" ]
