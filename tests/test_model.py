import torch

from model.model import MnistNet

def test_model_forward_shape():
    model = MnistNet()
    x = torch.randn(1, 1, 28, 28)
    out = model(x)
    assert out.shape == (1, 10)
